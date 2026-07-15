import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';

/** Keep the first Web render equal to the static export, then apply the real viewport. */
export function useWideLayout(breakpoint: number): boolean {
  const { width } = useWindowDimensions();
  const [hydrated, setHydrated] = useState(Platform.OS !== 'web');

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated && width >= breakpoint;
}
