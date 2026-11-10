import styles from '@/app/home.module.css';

const InfoBox = ({ heading, buttonInfo, children }) => {
  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-xl font-semibold leading-7 sm:text-2xl">{heading}</h2>
      <p className="mb-5 mt-3 text-base leading-7 text-slate-300">{children}</p>
      <a
        href={buttonInfo.link}
        className={styles.action}
      >
        {buttonInfo.text}
      </a>
    </div>
  );
};
export default InfoBox;
