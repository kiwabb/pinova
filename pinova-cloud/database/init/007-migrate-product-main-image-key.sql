DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'pinova'
          AND table_name = 'product_spu'
          AND column_name = 'main_image_url'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'pinova'
          AND table_name = 'product_spu'
          AND column_name = 'main_image_key'
    ) THEN
        ALTER TABLE pinova.product_spu
            RENAME COLUMN main_image_url TO main_image_key;

        ALTER TABLE pinova.product_spu
            RENAME CONSTRAINT ck_product_spu_main_image_not_blank
            TO ck_product_spu_main_image_key_not_blank;
    END IF;
END
$$;

COMMENT ON COLUMN pinova.product_spu.main_image_key IS '商品主图对象存储 Key';
