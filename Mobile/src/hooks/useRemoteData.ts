import { useCallback, useEffect, useRef, useState } from 'react';

type ResourceState<T> = {
  key: string;
  data?: T;
  loading: boolean;
  error: string;
};

export function useRemoteData<T>(loader: () => Promise<T>, dependencyKey = '') {
  const loaderRef = useRef(loader);
  const requestVersion = useRef(0);
  const [resource, setResource] = useState<ResourceState<T>>({
    key: dependencyKey,
    loading: true,
    error: '',
  });

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const reload = useCallback(async () => {
    const version = ++requestVersion.current;
    setResource((current) => ({
      key: dependencyKey,
      data: current.key === dependencyKey ? current.data : undefined,
      loading: true,
      error: '',
    }));
    try {
      const data = await loaderRef.current();
      if (version !== requestVersion.current) return;
      setResource({ key: dependencyKey, data, loading: false, error: '' });
    } catch (reason) {
      if (version !== requestVersion.current) return;
      setResource((current) => ({
        key: dependencyKey,
        data: current.key === dependencyKey ? current.data : undefined,
        loading: false,
        error: reason instanceof Error ? reason.message : 'Không thể tải dữ liệu.',
      }));
    }
  }, [dependencyKey]);

  useEffect(() => {
    const version = ++requestVersion.current;
    loaderRef.current()
      .then((data) => {
        if (version === requestVersion.current) setResource({ key: dependencyKey, data, loading: false, error: '' });
      })
      .catch((reason: unknown) => {
        if (version === requestVersion.current) {
          setResource({
            key: dependencyKey,
            loading: false,
            error: reason instanceof Error ? reason.message : 'Không thể tải dữ liệu.',
          });
        }
      });
    return () => { requestVersion.current += 1; };
  }, [dependencyKey]);

  const visible = resource.key === dependencyKey
    ? resource
    : { key: dependencyKey, loading: true, error: '' };

  return {
    data: visible.data ?? null,
    loading: visible.loading,
    error: visible.error,
    reload,
  };
}
