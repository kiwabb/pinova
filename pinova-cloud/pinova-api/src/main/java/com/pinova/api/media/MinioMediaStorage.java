package com.pinova.api.media;
import io.minio.*;import org.springframework.beans.factory.annotation.Value;import org.springframework.stereotype.Component;import org.springframework.web.multipart.MultipartFile;import java.io.InputStream;import java.util.*;
@Component public class MinioMediaStorage{
 private static final Set<String> TYPES=Set.of("image/jpeg","image/png","image/webp");private final MinioClient client;private final String bucket;
 public MinioMediaStorage(@Value("${pinova.storage.endpoint}")String endpoint,@Value("${pinova.storage.access-key}")String access,@Value("${pinova.storage.secret-key}")String secret,@Value("${pinova.storage.bucket}")String bucket){this.client=MinioClient.builder().endpoint(endpoint).credentials(access,secret).build();this.bucket=bucket;}
 public UploadedMedia upload(Long productId,MultipartFile file){if(file==null||file.isEmpty()||file.getSize()>10_000_000||!TYPES.contains(file.getContentType()))throw new IllegalArgumentException("只允许 10MB 内的 JPEG、PNG 或 WebP 图片");String ext=switch(file.getContentType()){case"image/jpeg"->"jpg";case"image/png"->"png";default->"webp";};String key="product/"+productId+"/"+UUID.randomUUID()+"."+ext;try(InputStream in=file.getInputStream()){client.putObject(PutObjectArgs.builder().bucket(bucket).object(key).stream(in,file.getSize(),-1).contentType(file.getContentType()).build());return new UploadedMedia(key,file.getContentType(),file.getSize());}catch(Exception e){throw new IllegalStateException("商品媒体上传失败",e);}}
 public record UploadedMedia(String objectKey,String mimeType,long fileSizeBytes){}
}
