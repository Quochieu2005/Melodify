import { useCallback, useEffect, useRef, useState } from 'react';

type ResourceState<T> = {
  key: string;
  data?: T;
  loading: boolean;
  error: string;
};

export function useRemoteData<T>(loader: () => Promise<T>, dependencyKey = '') {
  const loaderRef = useRef(loader);
  const [resource, setResource] = useState<ResourceState<T>>({
    key: dependencyKey,
    loading: true,
    error: '',
  });

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const reload = useCallback(async () => {
    setResource((current) => ({
      key: dependencyKey,
      data: current.key === dependencyKey ? current.data : undefined,
      loading: true,
      error: '',
    }));
    try {
      const data = await loaderRef.current();
      setResource({ key: dependencyKey, data, loading: false, error: '' });
    } catch (reason) {
      setResource({
        key: dependencyKey,
        loading: false,
        error: reason instanceof Error ? reason.message : 'Không thể tải dữ liệu.',
      });
    }
  }, [dependencyKey]);

  useEffect(() => {
    let active = true;
    loaderRef.current()
      .then((data) => {
        if (active) setResource({ key: dependencyKey, data, loading: false, error: '' });
      })
      .catch((reason: unknown) => {
        if (active) {
          setResource({
            key: dependencyKey,
            loading: false,
            error: reason instanceof Error ? reason.message : 'Không thể tải dữ liệu.',
          });
        }
      });
    return () => { active = false; };
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
