import { useEffect, useState } from 'react';
import { getUserDashboard } from '../api.js';
export default function useUserDashboard() {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, data: null, error: '' });
    getUserDashboard({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ loading: false, data, error: '' });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            loading: false,
            data: null,
            error:
              error.status === 401
                ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง'
                : 'โหลดภาพรวมไม่สำเร็จ กรุณาลองใหม่',
          });
      });
    return () => controller.abort();
  }, [revision]);
  return { ...state, reload: () => setRevision((value) => value + 1) };
}
