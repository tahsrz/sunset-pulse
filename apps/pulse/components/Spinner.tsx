'use client';
import ClipLoader from 'react-spinners/ClipLoader';

interface SpinnerProps {
  loading: boolean;
}

const override: React.CSSProperties = {
  display: 'block',
  margin: '100px auto',
};

const Spinner: React.FC<SpinnerProps> = ({ loading }) => {
  return (
    <ClipLoader
      color='#3b82f6'
      loading={loading}
      cssOverride={override}
      size={150}
      aria-label='Loading Spinner'
    />
  );
};

export default Spinner;
