BEGIN;

INSERT INTO pinova.product_spu_detail (
    id, spu_id, content_schema_version, detail_document,
    packing_list, usage_instructions, after_sales_note,
    version, created_by, updated_by
)
SELECT
    seed.detail_id,
    product.id,
    1,
    jsonb_build_object(
        'blocks',
        jsonb_build_array(
            jsonb_build_object(
                'type', 'heading',
                'data', jsonb_build_object('text', '商品亮点', 'level', 2)
            ),
            jsonb_build_object(
                'type', 'paragraph',
                'data', jsonb_build_object('text', product.summary)
            )
        )
    ),
    seed.packing_list,
    seed.usage_instructions,
    seed.after_sales_note,
    0,
    0,
    0
FROM (VALUES
    (960000000000000001::bigint, 100000000000000001::bigint, '48 色体验豆、拼板、镊子、熨烫纸和基础图纸', '按图纸色号分区摆放，完成后由成年人协助熨烫。', '未拆封耗材支持按商城规则申请售后。'),
    (960000000000000002::bigint, 100000000000000002::bigint, '亲子图纸、分装拼豆、拼板、镊子和熨烫纸', '建议由成人负责颜色分区，儿童完成拼摆。', '材料包拆封后缺件可联系客服核对补发。'),
    (960000000000000003::bigint, 100000000000000003::bigint, '双份莓果图纸、分装拼豆、挂扣和连接环', '完成拼摆和熨烫后再安装五金挂扣。', '五金配件缺失可凭包装照片申请补发。'),
    (960000000000000004::bigint, 100000000000000004::bigint, '分板图纸、主题拼豆、拼板、镊子和熨烫纸', '建议按分板编号依次制作，最后组合成完整画面。', '大幅作品属于耗材组合，拆封后按缺件规则处理。'),
    (960000000000000005::bigint, 100000000000000005::bigint, '双人材料、工具使用、创作指导和现场熨烫', '到店后向工作人员出示预约信息，体验时长约两小时。', '预约改期和取消以门店确认结果为准。'),
    (960000000000000006::bigint, 100000000000000006::bigint, '定制图纸、色号清单、材料用量和可编辑工程文件', '上传主体清晰、光线均匀的照片可获得更好的转换效果。', '开始人工校对后不支持无理由取消。'),
    (960000000000000007::bigint, 100000000000000007::bigint, '独立创作桌、基础材料和现场配色建议', '预约时段内到店签到，迟到不会顺延结束时间。', '预约改期和取消以门店确认结果为准。'),
    (960000000000000008::bigint, 100000000000000008::bigint, '城市主题分装拼豆和杯垫图纸', '本材料包用于补做主题杯垫，不包含拼板和镊子。', '分装耗材拆封后仅处理缺件或错色问题。'),
    (960000000000000009::bigint, 100000000000000101::bigint, '基础拼豆、入门图纸和熨烫纸', '适合用于验证商品详情与库存接口。', '演示商品按商城统一售后规则处理。')
) AS seed(detail_id, spu_id, packing_list, usage_instructions, after_sales_note)
JOIN pinova.product_spu product ON product.id = seed.spu_id
ON CONFLICT (spu_id) DO UPDATE SET
    content_schema_version = EXCLUDED.content_schema_version,
    detail_document = EXCLUDED.detail_document,
    packing_list = EXCLUDED.packing_list,
    usage_instructions = EXCLUDED.usage_instructions,
    after_sales_note = EXCLUDED.after_sales_note,
    version = product_spu_detail.version + 1,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 0;

INSERT INTO pinova.product_media (
    id, spu_id, sku_id, media_type, media_role, object_key,
    mime_type, file_size_bytes, width, height, alt_text,
    sort_order, status, version, deleted, created_by, updated_by
)
SELECT
    seed.id,
    CASE WHEN seed.owner_type = 'SPU' THEN seed.owner_id END,
    CASE WHEN seed.owner_type = 'SKU' THEN seed.owner_id END,
    1,
    1,
    seed.object_key,
    'image/webp',
    seed.file_size_bytes,
    seed.width,
    seed.height,
    product.name,
    0,
    1,
    0,
    false,
    0,
    0
FROM (VALUES
    (970000000000000001::bigint, 'SKU', 920000000000000001::bigint, 100000000000000001::bigint, 'product/demo/photo-to-pattern.webp', 139220::bigint, 1607, 979),
    (970000000000000002::bigint, 'SKU', 920000000000000002::bigint, 100000000000000002::bigint, 'product/demo/parent-child.webp', 146822::bigint, 1691, 930),
    (970000000000000003::bigint, 'SKU', 920000000000000003::bigint, 100000000000000003::bigint, 'product/demo/couple-charms.webp', 84636::bigint, 1536, 1024),
    (970000000000000004::bigint, 'SKU', 920000000000000004::bigint, 100000000000000004::bigint, 'product/demo/wuhan-kit.webp', 354550::bigint, 1254, 1254),
    (970000000000000005::bigint, 'SPU', 100000000000000005::bigint, 100000000000000005::bigint, 'product/demo/couple-cups.webp', 164700::bigint, 1254, 1254),
    (970000000000000006::bigint, 'SPU', 100000000000000006::bigint, 100000000000000006::bigint, 'product/demo/photo-to-pattern.webp', 139220::bigint, 1607, 979),
    (970000000000000007::bigint, 'SPU', 100000000000000007::bigint, 100000000000000007::bigint, 'product/demo/parent-child.webp', 146822::bigint, 1691, 930),
    (970000000000000008::bigint, 'SPU', 100000000000000008::bigint, 100000000000000008::bigint, 'product/demo/wuhan-kit.webp', 354550::bigint, 1254, 1254)
) AS seed(id, owner_type, owner_id, spu_id, object_key, file_size_bytes, width, height)
JOIN pinova.product_spu product ON product.id = seed.spu_id
ON CONFLICT (id) DO UPDATE SET
    spu_id = EXCLUDED.spu_id,
    sku_id = EXCLUDED.sku_id,
    media_type = EXCLUDED.media_type,
    media_role = EXCLUDED.media_role,
    object_key = EXCLUDED.object_key,
    cover_object_key = NULL,
    mime_type = EXCLUDED.mime_type,
    file_size_bytes = EXCLUDED.file_size_bytes,
    width = EXCLUDED.width,
    height = EXCLUDED.height,
    duration_ms = NULL,
    alt_text = EXCLUDED.alt_text,
    sort_order = EXCLUDED.sort_order,
    status = EXCLUDED.status,
    version = product_media.version + 1,
    deleted = false,
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = CURRENT_TIMESTAMP,
    updated_by = 0;

COMMIT;
