import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { cartItemFixture, mockShoppingCart } from "./shopping-cart-fixture";

async function mockCheckoutPrerequisites(page: Page) {
  await mockShoppingCart(page, [cartItemFixture]);
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      json: {
        code: "SUCCESS",
        message: "success",
        data: {
          id: "900000000000000001",
          memberNo: "P0001",
          nickname: "拼豆用户",
          avatarUrl: null,
        },
      },
    });
  });
  await page.route("**/api/member-addresses", async (route) => {
    await route.fulfill({
      json: {
        code: "SUCCESS",
        message: "success",
        data: [
          {
            id: "970000000000000001",
            receiverName: "王小明",
            receiverMobile: "+8613800000000",
            countryCode: "CN",
            provinceCode: "420000",
            provinceName: "湖北省",
            cityCode: "420100",
            cityName: "武汉市",
            districtCode: "420106",
            districtName: "武昌区",
            detailAddress: "测试街道 1 号",
            postalCode: null,
            label: "家",
            defaultAddress: true,
            version: 3,
          },
          {
            id: "970000000000000002",
            receiverName: "李小红",
            receiverMobile: "+8613900000000",
            countryCode: "CN",
            provinceCode: "440000",
            provinceName: "广东省",
            cityCode: "440100",
            cityName: "广州市",
            districtCode: "440106",
            districtName: "天河区",
            detailAddress: "测试大道 2 号",
            postalCode: null,
            label: null,
            defaultAddress: false,
            version: 4,
          },
        ],
      },
    });
  });
}

test("checkout reviews real data and submits a versioned order payload", async ({
  page,
}) => {
  await mockCheckoutPrerequisites(page);

  let submittedBody: unknown;
  let idempotencyKey = "";
  await page.route("**/api/orders", async (route) => {
    submittedBody = route.request().postDataJSON();
    idempotencyKey = route.request().headers()["idempotency-key"] ?? "";
    await route.fulfill({
      status: 404,
      json: { title: "Not Found", detail: "No static resource orders" },
    });
  });

  await page.goto("/checkout");

  await expect(page.getByRole("heading", { name: "确认订单", level: 1 })).toBeVisible();
  await expect(page.getByRole("radio", { name: /王小明/ })).toBeChecked();
  await expect(page.getByRole("link", { name: "48 色基础拼豆套装" })).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "订单汇总" }).getByText("¥59.90"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  ).toBe(false);

  await page.getByRole("radio", { name: /李小红/ }).click();
  await expect(page.getByRole("radio", { name: /李小红/ })).toBeChecked();
  await page.getByRole("textbox", { name: "订单备注（选填）" }).fill("周末收货");
  await page.getByRole("button", { name: "提交订单" }).click();

  await expect(
    page
      .getByRole("complementary", { name: "订单汇总" })
      .getByRole("alert"),
  ).toContainText("订单服务当前不可用");
  expect(idempotencyKey).not.toBe("");
  expect(submittedBody).toEqual({
    cartId: "980000000000000001",
    shippingAddressId: "970000000000000002",
    shippingAddressVersion: 4,
    items: [
      {
        cartItemId: "990000000000000001",
        cartItemVersion: 1,
        skuId: "920000000000000001",
        quantity: 1,
      },
    ],
    buyerRemark: "周末收货",
  });
});

test("checkout renders every order returned by a successful multi-shop submission", async ({
  page,
}) => {
  await mockCheckoutPrerequisites(page);
  await page.route("**/api/orders", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: `{
        "code":"SUCCESS",
        "message":"success",
        "data":{
          "checkoutNo":"${crypto.randomUUID()}",
          "orders":[
            {"id":930000000000000001,"orderNo":"PO202607180001","status":"PENDING_PAYMENT"},
            {"id":930000000000000002,"orderNo":"PO202607180002","status":"PENDING_PAYMENT"}
          ]
        }
      }`,
    });
  });

  await page.goto("/checkout");
  await page.getByRole("button", { name: "提交订单" }).click();

  await expect(page.getByRole("heading", { name: "订单已提交" })).toBeVisible();
  await expect(page.getByText("本次已创建 2 笔订单")).toBeVisible();
  await expect(page.getByRole("list", { name: "已提交订单" })).toHaveText(
    /PO202607180001.*PO202607180002/,
  );
  await expect(page.getByRole("link", { name: /查看我的订单/ })).toHaveAttribute(
    "href",
    "/account/orders",
  );
});
