import { adminApiRequest } from "../../lib/admin-api-client";

export interface AdminMember { id:string;memberNo:string;username:string|null;mobile:string|null;email:string|null;nickname:string|null;status:number;version:number;lastLoginAt:string|null;createdAt:string; }
export interface AdminCategory { id:string;parentId:string|null;categoryCode:string;name:string;level:number;sortOrder:number;iconUrl:string|null;status:number;version:number; }
export interface AfterSale { afterSaleNo:string;orderNo:string;status:string;amountFen:number;currencyCode:string;reasonCode:number;reason:string|null;reviewReason:string|null;refundNo:string|null;refundStatus:string|null;version:number;appliedAt:string;completedAt:string|null; }
export interface Warehouse { id:string;shopId:string;warehouseCode:string;name:string;warehouseType:number;status:number;version:number; }
export interface Stock { id:string;warehouseId:string;skuId:string;onHandQuantity:number;reservedQuantity:number;availableQuantity:number;version:number; }
export interface Audit { id:string;operatorId:string;domainCode:string;actionCode:string;targetType:string;targetId:string;requestId:string|null;reason:string|null;occurredAt:string; }
export interface ProductSku {id:string;skuCode:string;specSummary:string|null;salePriceFen:number;inventoryMode:number;mainImageKey:string|null;barcode:string|null;status:number;sortOrder:number;version:number}
export interface ProductMedia {id:string;skuId:string|null;objectKey:string;mediaRole:number;altText:string|null;sortOrder:number;version:number}
export interface Product { id:string;shopId:string;categoryId:string;spuCode:string;name:string;summary:string|null;mainImageKey:string|null;status:number;sortOrder:number;version:number;skus:ProductSku[];media:ProductMedia[];detail:{document:unknown;packingList:string|null;usageInstructions:string|null;afterSalesNote:string|null;version:number}|null; }

export const operationsApi={
 members:(keyword="")=>adminApiRequest<AdminMember[]>(`/admin/members?keyword=${encodeURIComponent(keyword)}`),
 memberStatus:(m:AdminMember,status:number,reason:string)=>adminApiRequest<AdminMember>(`/admin/members/${m.memberNo}/status`,{method:"PUT",body:JSON.stringify({version:m.version,status,reason})}),
 revokeMember:(m:AdminMember,reason:string)=>adminApiRequest<void>(`/admin/members/${m.memberNo}/revoke-sessions`,{method:"POST",body:JSON.stringify({reason})}),
 categories:()=>adminApiRequest<AdminCategory[]>("/admin/categories"),
 saveCategory:(id:string|null,body:Record<string,unknown>)=>adminApiRequest<AdminCategory>(id?`/admin/categories/${id}`:"/admin/categories",{method:id?"PUT":"POST",body:JSON.stringify(body)}),
 deleteCategory:(c:AdminCategory,reason:string)=>adminApiRequest<void>(`/admin/categories/${c.id}?version=${c.version}`,{method:"DELETE",body:JSON.stringify({reason})}),
 afterSales:()=>adminApiRequest<AfterSale[]>("/admin/after-sales"),
 reviewAfterSale:(s:AfterSale,approved:boolean,reason:string)=>adminApiRequest<AfterSale>(`/admin/after-sales/${s.afterSaleNo}/review`,{method:"POST",body:JSON.stringify({version:s.version,approved,reason})}),
 retryRefund:(s:AfterSale)=>adminApiRequest<AfterSale>(`/admin/after-sales/${s.afterSaleNo}/refund/retry`,{method:"POST"}),
 reconcileRefund:(s:AfterSale)=>adminApiRequest<AfterSale>(`/admin/after-sales/${s.afterSaleNo}/refund/reconcile`,{method:"POST"}),
 warehouses:()=>adminApiRequest<Warehouse[]>("/admin/inventory/warehouses"),stocks:()=>adminApiRequest<Stock[]>("/admin/inventory/stocks"),
 saveWarehouse:(id:string|null,body:Record<string,unknown>)=>adminApiRequest<Warehouse>(id?`/admin/inventory/warehouses/${id}`:"/admin/inventory/warehouses",{method:id?"PUT":"POST",body:JSON.stringify(body)}),
 adjustStock:(s:Stock,body:Record<string,unknown>)=>adminApiRequest<Stock>(`/admin/inventory/stocks/${s.id}/adjustments`,{method:"POST",body:JSON.stringify({...body,version:s.version})}),
 audits:()=>adminApiRequest<Audit[]>("/admin/audits"),products:()=>adminApiRequest<Product[]>("/admin/products"),
 saveProduct:(id:string|null,body:Record<string,unknown>)=>adminApiRequest<Product>(id?`/admin/products/${id}`:"/admin/products",{method:id?"PUT":"POST",body:JSON.stringify(body)}),
 saveSku:(p:Product,id:string|null,body:Record<string,unknown>)=>adminApiRequest<Product>(id?`/admin/products/${p.id}/skus/${id}`:`/admin/products/${p.id}/skus`,{method:id?"PUT":"POST",body:JSON.stringify(body)}),
 saveDetail:(p:Product,body:Record<string,unknown>)=>adminApiRequest<Product>(`/admin/products/${p.id}/detail`,{method:"PUT",body:JSON.stringify(body)}),
 uploadMedia:(p:Product,data:FormData)=>adminApiRequest<Product>(`/admin/products/${p.id}/media`,{method:"POST",body:data}),
 deleteProduct:(p:Product,reason:string)=>adminApiRequest<void>(`/admin/products/${p.id}?version=${p.version}`,{method:"DELETE",body:JSON.stringify({reason})}),
 deleteSku:(p:Product,sku:ProductSku,reason:string)=>adminApiRequest<void>(`/admin/products/${p.id}/skus/${sku.id}?version=${sku.version}`,{method:"DELETE",body:JSON.stringify({reason})}),
 deleteMedia:(p:Product,media:ProductMedia,reason:string)=>adminApiRequest<void>(`/admin/products/${p.id}/media/${media.id}?version=${media.version}`,{method:"DELETE",body:JSON.stringify({reason})}),
};
