import Image from 'next/image';
import { isRemoteImageSource } from '@/lib/imageSource';

interface PropertyHeaderImageProps {
  image: string;
}

const PropertyHeaderImage: React.FC<PropertyHeaderImageProps> = ({ image }) => {
  return (
    <section>
      <div className='container-xl m-auto'>
        <div className='grid grid-cols-1'>
          <Image
            src={image}
            unoptimized={isRemoteImageSource(image)}
            alt='Property Header'
            className='object-cover h-[400px] w-full'
            width={0}
            height={0}
            sizes='100vw'
            priority={true}
          />
        </div>
      </div>
    </section>
  );
};

export default PropertyHeaderImage;
