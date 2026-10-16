import InfoBox from './InfoBox';

const InfoBoxes = () => {
  return (
    <section className='waterlily-section py-16 sm:py-20'>
      <div className='mx-auto max-w-7xl px-6'>
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          <InfoBox
            heading='Portfolio Search'
            backgroundColor='bg-transparent'
            textColor='text-slate-100'
            buttonInfo={{
              text: 'Browse Properties',
              link: '/properties',
              backgroundColor: 'bg-transparent',
            }}
          >
            Identify strong rental opportunities. Manage bookmarks and coordinate directly with property managers.
          </InfoBox>
          <InfoBox
            heading='Property Management'
            backgroundColor='bg-transparent'
            textColor='text-slate-100'
            buttonInfo={{
              text: 'List Property',
              link: '/properties/add',
              backgroundColor: 'bg-transparent',
            }}
          >
            Onboard your properties to the platform for better market exposure and tenant lead generation.
          </InfoBox>
        </div>
      </div>
    </section>
  );
};
export default InfoBoxes;
