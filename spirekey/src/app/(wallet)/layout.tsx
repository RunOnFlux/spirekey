import dynamic from 'next/dynamic';
import { Stack } from '@kadena/kode-ui';
import './global.css';
import { layoutWrapperClass } from './styles.css';

const IntendNotification = dynamic(
  () => import('@/components/IntendNotification/IntendNotification'),
  {
    ssr: false,
  },
);

export default function WalletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <IntendNotification />
      <Stack
        alignItems="center"
        flexDirection="column"
        className={layoutWrapperClass}
      >
        {children}
      </Stack>
    </>
  );
}
