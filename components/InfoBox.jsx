const InfoBox = ({
  heading,
  backgroundColor = 'bg-gray-100',
  textColor = 'text-gray-800',
  buttonInfo,
  children,
}) => {
  return (
    <div className={`${backgroundColor} waterlily-card p-6 rounded-2xl`}>
      <h2 className={`${textColor} text-2xl font-bold waterlily-heading`}>{heading}</h2>
      <p className={`${textColor} mt-2 mb-4 opacity-80`}>{children}</p>
      <a
        href={buttonInfo.link}
        className={`inline-block waterlily-button text-white rounded-lg px-4 py-2`}
      >
        {buttonInfo.text}
      </a>
    </div>
  );
};
export default InfoBox;
