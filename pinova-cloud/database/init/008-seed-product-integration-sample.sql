BEGIN;

INSERT INTO pinova.product_spu (
    id, shop_id, category_id, spu_code, name, summary, product_type,
    main_image_key, status, sort_order, published_at, version, deleted,
    created_by, updated_by
)
SELECT
    100000000000000101,
    900000000000000001,
    category.id,
    'PINOVA-STARTER-001',
    'Pinova 基础拼豆材料包',
    '用于验证商城商品列表读取数据库实时数据。',
    1,
    NULL,
    2,
    90,
    TIMESTAMPTZ '2026-07-15 00:00:00+08',
    0,
    false,
    0,
    0
FROM pinova.product_category category
WHERE lower(category.category_code) = 'first-project'
  AND category.status = 1
  AND category.deleted = false
ON CONFLICT (shop_id, lower(spu_code)) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    summary = EXCLUDED.summary,
    product_type = EXCLUDED.product_type,
    main_image_key = EXCLUDED.main_image_key,
    status = EXCLUDED.status,
    sort_order = EXCLUDED.sort_order,
    published_at = EXCLUDED.published_at,
    off_shelf_at = NULL,
    deleted = false,
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 0;

COMMIT;
