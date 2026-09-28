const InfoBox = ({
  heading,
  backgroundColor = 'bg-gray-100',
  textColor = 'text-gray-800',
  buttonInfo,
  children,
}) => {
  return (
    <div className={`${backgroundColor} waterlily-card min-w-0 rounded-2xl p-6 sm:p-8`}>
      <h2 className={`${textColor} text-xl font-semibold leading-7 waterlily-heading sm:text-2xl`}>{heading}</h2>
      <p className={`${textColor} mt-3 mb-5 text-sm leading-6 opacity-80 sm:text-base sm:leading-7`}>{children}</p>
      <a
        href={buttonInfo.link}
        className={`inline-flex min-h-11 items-center justify-center waterlily-button text-white rounded-lg px-4 py-2 text-sm font-semibold`}
      >
        {buttonInfo.text}
      </a>
    </div>
  );
};
export default InfoBox;
