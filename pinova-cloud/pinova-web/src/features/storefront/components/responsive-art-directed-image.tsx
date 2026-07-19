import { getImageProps, type StaticImageData } from "next/image";

interface ResponsiveArtDirectedImageProps {
  alt: string;
  className: string;
  desktopImage: StaticImageData;
  highPriority?: boolean;
  mobileImage: StaticImageData;
}

export function ResponsiveArtDirectedImage({
  alt,
  className,
  desktopImage,
  highPriority = false,
  mobileImage,
}: ResponsiveArtDirectedImageProps) {
  const common = { alt, sizes: "100vw" };
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({ ...common, src: desktopImage });
  const {
    props: { srcSet: mobileSrcSet, ...imageProps },
  } = getImageProps({
    ...common,
    fetchPriority: highPriority ? "high" : "auto",
    loading: highPriority ? "eager" : "lazy",
    src: mobileImage,
  });

  return (
    <picture className={className}>
      <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
      <source srcSet={mobileSrcSet} />
      <img {...imageProps} alt={alt} />
    </picture>
  );
}
