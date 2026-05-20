import InfoBox from './InfoBox';

const InfoBoxes = () => {
  return (
    <section className='waterlily-section py-10'>
      <div className='container-xl lg:container m-auto'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg'>
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
