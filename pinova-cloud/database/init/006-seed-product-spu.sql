BEGIN;

INSERT INTO pinova.product_spu (
    id, shop_id, category_id, spu_code, name, summary, product_type, main_image_key,
    status, sort_order, published_at, version, deleted, created_by, updated_by
)
SELECT
    seed.id,
    900000000000000001,
    category.id,
    seed.spu_code,
    seed.name,
    seed.summary,
    seed.product_type,
    seed.main_image_key,
    2,
    seed.sort_order,
    TIMESTAMPTZ '2026-07-15 00:00:00+08',
    0,
    false,
    0,
    0
FROM (VALUES
    (
        100000000000000001::bigint,
        'DEMO-000001',
        'first-project',
        '48 色基础拼豆套装',
        '包含 48 色体验豆、拼板、镊子与熨烫纸，适合第一次完成 4 至 6 幅小作品。',
        1::smallint,
        'product/demo/photo-to-pattern.webp',
        10
    ),
    (
        100000000000000002::bigint,
        'DEMO-000002',
        'family-kits',
        '花园小屋亲子材料包',
        '大颗粒分区图纸配合清晰色号，适合亲子协作完成花园小屋与花朵杯垫。',
        1::smallint,
        'product/demo/parent-child.webp',
        20
    ),
    (
        100000000000000003::bigint,
        'DEMO-000003',
        'charms',
        '莓果双人挂件材料包',
        '两份独立配色与五金挂扣，可以各自完成一枚相互呼应的莓果挂件。',
        1::smallint,
        'product/demo/couple-charms.webp',
        30
    ),
    (
        100000000000000004::bigint,
        'DEMO-000004',
        'city-patterns',
        '武汉城市记忆大幅套装',
        '以长江大桥、黄鹤与热干面为主题的大幅材料包，配齐分板图纸与色号清单。',
        1::smallint,
        'product/demo/wuhan-kit.webp',
        40
    ),
    (
        100000000000000005::bigint,
        'DEMO-000005',
        'beginner-workshop',
        '暖饮杯套双人体验包',
        '到店完成两只杯套图案，包含材料、工具使用与一次现场熨烫服务。',
        3::smallint,
        'product/demo/couple-cups.webp',
        50
    ),
    (
        100000000000000006::bigint,
        'DEMO-000006',
        'photo-patterns',
        '照片定制图纸服务',
        '上传清晰照片后生成 64 格定制图纸，提供色号、材料用量和可编辑工程文件。',
        2::smallint,
        'product/demo/photo-to-pattern.webp',
        60
    ),
    (
        100000000000000007::bigint,
        'DEMO-000007',
        'family-workshop',
        '家庭周末创作桌预约',
        '两小时独立创作桌，包含一大一小基础材料与现场配色建议。',
        3::smallint,
        'product/demo/parent-child.webp',
        70
    ),
    (
        100000000000000008::bigint,
        'DEMO-000008',
        '5mm-beads',
        '城市漫游杯垫材料包',
        '城市主题杯垫用豆补充包，按图纸用量分装，适合补做或替换常用颜色。',
        1::smallint,
        'product/demo/wuhan-kit.webp',
        80
    )
) AS seed(id, spu_code, category_code, name, summary, product_type, main_image_key, sort_order)
JOIN pinova.product_category category
    ON lower(category.category_code) = lower(seed.category_code)
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
