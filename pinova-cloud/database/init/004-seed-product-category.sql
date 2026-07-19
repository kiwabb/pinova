BEGIN;

INSERT INTO pinova.product_category (
    id, parent_id, category_code, name, level, sort_order,
    status, version, deleted, created_by, updated_by
)
VALUES
    (910000000000000001, NULL, 'starter-kits',     '新手套装',   1, 10, 1, 0, false, 0, 0),
    (910000000000000002, NULL, 'bead-refills',     '拼豆补充',   1, 20, 1, 0, false, 0, 0),
    (910000000000000003, NULL, 'pattern-kits',     '图纸材料包', 1, 30, 1, 0, false, 0, 0),
    (910000000000000004, NULL, 'tools',            '工具配件',   1, 40, 1, 0, false, 0, 0),
    (910000000000000005, NULL, 'finished-goods',   '成品好物',   1, 50, 1, 0, false, 0, 0),
    (910000000000000006, NULL, 'store-experience', '到店体验',   1, 60, 1, 0, false, 0, 0)
ON CONFLICT (lower(category_code)) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    name = EXCLUDED.name,
    level = EXCLUDED.level,
    sort_order = EXCLUDED.sort_order,
    status = 1,
    deleted = false,
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 0;

INSERT INTO pinova.product_category (
    id, parent_id, category_code, name, level, sort_order,
    status, version, deleted, created_by, updated_by
)
SELECT
    seed.id, parent.id, seed.category_code, seed.name, 2, seed.sort_order,
    1, 0, false, 0, 0
FROM (VALUES
    (910000000000000101::bigint, 'starter-kits',     'starter-level',        '按熟练度',   10),
    (910000000000000102::bigint, 'starter-kits',     'starter-theme',        '按主题',     20),
    (910000000000000103::bigint, 'bead-refills',     'bead-size',            '按尺寸',     10),
    (910000000000000104::bigint, 'bead-refills',     'bead-colors',          '按色系',     20),
    (910000000000000105::bigint, 'pattern-kits',     'pattern-themes',       '主题图纸',   10),
    (910000000000000106::bigint, 'pattern-kits',     'custom-patterns',      '定制图纸',   20),
    (910000000000000107::bigint, 'tools',            'making-tools',         '制作工具',   10),
    (910000000000000108::bigint, 'tools',            'storage-tools',        '收纳展示',   20),
    (910000000000000109::bigint, 'finished-goods',   'finished-accessories', '随身小物',   10),
    (910000000000000110::bigint, 'finished-goods',   'finished-decor',       '家居摆件',   20),
    (910000000000000111::bigint, 'store-experience', 'workshop-booking',     '创作桌预约', 10),
    (910000000000000112::bigint, 'store-experience', 'store-services',       '门店服务',   20)
) AS seed(id, parent_code, category_code, name, sort_order)
JOIN pinova.product_category parent
    ON lower(parent.category_code) = lower(seed.parent_code)
ON CONFLICT (lower(category_code)) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    name = EXCLUDED.name,
    level = EXCLUDED.level,
    sort_order = EXCLUDED.sort_order,
    status = 1,
    deleted = false,
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 0;

INSERT INTO pinova.product_category (
    id, parent_id, category_code, name, level, sort_order,
    status, version, deleted, created_by, updated_by
)
SELECT
    seed.id, parent.id, seed.category_code, seed.name, 3, seed.sort_order,
    1, 0, false, 0, 0
FROM (VALUES
    (910000000000000201::bigint, 'starter-level',        'first-project',       '第一次尝试',   10),
    (910000000000000202::bigint, 'starter-level',        'family-kits',         '亲子共创',     20),
    (910000000000000203::bigint, 'starter-theme',        'floral-kits',         '花园植物',     10),
    (910000000000000204::bigint, 'starter-theme',        'mini-kits',           '迷你挂件',     20),
    (910000000000000205::bigint, 'bead-size',            '2-6mm-beads',         '2.6mm 小豆',   10),
    (910000000000000206::bigint, 'bead-size',            '5mm-beads',           '5mm 标准豆',   20),
    (910000000000000207::bigint, 'bead-colors',          'basic-colors',        '基础常用色',   10),
    (910000000000000208::bigint, 'bead-colors',          'special-colors',      '特殊效果色',   20),
    (910000000000000209::bigint, 'pattern-themes',       'city-patterns',       '城市限定',     10),
    (910000000000000210::bigint, 'pattern-themes',       'nature-patterns',     '自然花园',     20),
    (910000000000000211::bigint, 'custom-patterns',      'photo-patterns',      '照片转图纸',   10),
    (910000000000000212::bigint, 'custom-patterns',      'portrait-patterns',   '人物与宠物',   20),
    (910000000000000213::bigint, 'making-tools',         'pegboards',           '拼板与连接件', 10),
    (910000000000000214::bigint, 'making-tools',         'tweezers-ironing',    '镊子与熨烫',   20),
    (910000000000000215::bigint, 'storage-tools',        'sorting-boxes',       '分色收纳盒',   10),
    (910000000000000216::bigint, 'storage-tools',        'display-accessories', '展示配件',     20),
    (910000000000000217::bigint, 'finished-accessories', 'charms',              '挂件与钥匙扣', 10),
    (910000000000000218::bigint, 'finished-accessories', 'coasters',            '杯垫与杯套',   20),
    (910000000000000219::bigint, 'finished-decor',       'framed-art',          '装裱画',       10),
    (910000000000000220::bigint, 'finished-decor',       'desk-decor',          '桌面摆件',     20),
    (910000000000000221::bigint, 'workshop-booking',     'beginner-workshop',   '新手体验',     10),
    (910000000000000222::bigint, 'workshop-booking',     'family-workshop',     '亲子与双人',   20),
    (910000000000000223::bigint, 'store-services',       'ironing-service',     '现场熨烫',     10),
    (910000000000000224::bigint, 'store-services',       'custom-service',      '图纸定制',     20)
) AS seed(id, parent_code, category_code, name, sort_order)
JOIN pinova.product_category parent
    ON lower(parent.category_code) = lower(seed.parent_code)
ON CONFLICT (lower(category_code)) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    name = EXCLUDED.name,
    level = EXCLUDED.level,
    sort_order = EXCLUDED.sort_order,
    status = 1,
    deleted = false,
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 0;

COMMIT;
