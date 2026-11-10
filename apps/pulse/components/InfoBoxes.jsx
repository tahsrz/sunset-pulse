import InfoBox from './InfoBox';
import styles from '@/app/home.module.css';

const InfoBoxes = () => {
  return (
    <section className={styles.section} aria-label="Property tools">
      <div className={styles.frame}>
        <div className={`${styles.grid} lg:grid-cols-2`}>
          <InfoBox
            heading='Portfolio Search'
            buttonInfo={{
              text: 'Browse Properties',
              link: '/properties',
            }}
          >
            Identify strong rental opportunities. Manage bookmarks and coordinate directly with property managers.
          </InfoBox>
          <InfoBox
            heading='Property Management'
            buttonInfo={{
              text: 'List Property',
              link: '/properties/add',
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
