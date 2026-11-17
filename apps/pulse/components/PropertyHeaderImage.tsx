import Image from 'next/image';
import { isRemoteImageSource } from '@/lib/imageSource';

export default function PropertyHeaderImage({ image, propertyName }: { image: string; propertyName: string }) {
  return (
    <Image
      src={image}
      alt={`Listing image for ${propertyName}`}
      unoptimized={isRemoteImageSource(image)}
      width={1280}
      height={800}
      sizes="(min-width: 1280px) 850px, (min-width: 1024px) 62vw, 100vw"
      className="aspect-[16/10] w-full rounded-2xl bg-slate-100 object-cover"
      priority
    />
  );
}
