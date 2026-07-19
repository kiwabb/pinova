BEGIN;

INSERT INTO pinova.warehouse (
    id, shop_id, warehouse_code, name, warehouse_type, status,
    version, deleted, created_by, updated_by
)
VALUES (
    930000000000000001,
    900000000000000001,
    'PINOVA-DEFAULT',
    'Pinova 默认仓库',
    1,
    1,
    0,
    false,
    0,
    0
)
ON CONFLICT (shop_id, lower(warehouse_code)) DO UPDATE SET
    name = EXCLUDED.name,
    warehouse_type = EXCLUDED.warehouse_type,
    status = EXCLUDED.status,
    deleted = false,
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 0;

INSERT INTO pinova.product_sku (
    id, spu_id, sku_code, sale_price_fen, inventory_mode, status,
    sort_order, version, deleted, created_by, updated_by
)
SELECT
    seed.id,
    product.id,
    seed.sku_code,
    seed.sale_price_fen,
    seed.inventory_mode,
    1,
    0,
    0,
    false,
    0,
    0
FROM (VALUES
    (920000000000000001::bigint, 100000000000000001::bigint, 'DEMO-SKU-000001',  5990::bigint, 1::smallint),
    (920000000000000002::bigint, 100000000000000002::bigint, 'DEMO-SKU-000002',  4590::bigint, 1::smallint),
    (920000000000000003::bigint, 100000000000000003::bigint, 'DEMO-SKU-000003',  3590::bigint, 1::smallint),
    (920000000000000004::bigint, 100000000000000004::bigint, 'DEMO-SKU-000004',  8990::bigint, 1::smallint),
    (920000000000000005::bigint, 100000000000000005::bigint, 'DEMO-SKU-000005', 12800::bigint, 3::smallint),
    (920000000000000006::bigint, 100000000000000006::bigint, 'DEMO-SKU-000006',  1990::bigint, 2::smallint),
    (920000000000000007::bigint, 100000000000000007::bigint, 'DEMO-SKU-000007', 16800::bigint, 3::smallint),
    (920000000000000008::bigint, 100000000000000008::bigint, 'DEMO-SKU-000008',  3990::bigint, 1::smallint),
    (920000000000000009::bigint, 100000000000000101::bigint, 'PINOVA-STARTER-001-DEFAULT', 2990::bigint, 1::smallint)
) AS seed(id, spu_id, sku_code, sale_price_fen, inventory_mode)
JOIN pinova.product_spu product ON product.id = seed.spu_id
ON CONFLICT (spu_id, lower(sku_code)) DO UPDATE SET
    sale_price_fen = EXCLUDED.sale_price_fen,
    inventory_mode = EXCLUDED.inventory_mode,
    status = 1,
    deleted = false,
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 0;

INSERT INTO pinova.inventory_stock (
    id, warehouse_id, sku_id, on_hand_quantity, reserved_quantity,
    version, created_by, updated_by
)
SELECT
    seed.id,
    warehouse.id,
    sku.id,
    seed.on_hand_quantity,
    0,
    0,
    0,
    0
FROM (VALUES
    (940000000000000001::bigint, 'DEMO-SKU-000001', 100::bigint),
    (940000000000000002::bigint, 'DEMO-SKU-000002',  50::bigint),
    (940000000000000003::bigint, 'DEMO-SKU-000003',   5::bigint),
    (940000000000000004::bigint, 'DEMO-SKU-000004',  30::bigint),
    (940000000000000008::bigint, 'DEMO-SKU-000008',   0::bigint),
    (940000000000000009::bigint, 'PINOVA-STARTER-001-DEFAULT', 20::bigint)
) AS seed(id, sku_code, on_hand_quantity)
JOIN pinova.product_sku sku ON lower(sku.sku_code) = lower(seed.sku_code)
JOIN pinova.warehouse warehouse
    ON warehouse.shop_id = 900000000000000001
   AND lower(warehouse.warehouse_code) = lower('PINOVA-DEFAULT')
ON CONFLICT (warehouse_id, sku_id) DO UPDATE SET
    on_hand_quantity = EXCLUDED.on_hand_quantity,
    reserved_quantity = 0,
    version = inventory_stock.version + 1,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 0;

INSERT INTO pinova.inventory_ledger (
    id, transaction_no, stock_id, change_type,
    on_hand_delta, reserved_delta, on_hand_after, reserved_after,
    reference_type, reference_id, remark, created_by, updated_by
)
SELECT
    seed.id,
    seed.transaction_no,
    stock.id,
    1,
    seed.quantity,
    0,
    seed.quantity,
    0,
    'SEED',
    sku.spu_id,
    'Demo 初始库存',
    0,
    0
FROM (VALUES
    (950000000000000001::bigint, 'SEED-INBOUND-000001', 'DEMO-SKU-000001', 100::bigint),
    (950000000000000002::bigint, 'SEED-INBOUND-000002', 'DEMO-SKU-000002',  50::bigint),
    (950000000000000003::bigint, 'SEED-INBOUND-000003', 'DEMO-SKU-000003',   5::bigint),
    (950000000000000004::bigint, 'SEED-INBOUND-000004', 'DEMO-SKU-000004',  30::bigint),
    (950000000000000009::bigint, 'SEED-INBOUND-000009', 'PINOVA-STARTER-001-DEFAULT', 20::bigint)
) AS seed(id, transaction_no, sku_code, quantity)
JOIN pinova.product_sku sku ON lower(sku.sku_code) = lower(seed.sku_code)
JOIN pinova.inventory_stock stock ON stock.sku_id = sku.id
ON CONFLICT (transaction_no) DO NOTHING;

COMMIT;
