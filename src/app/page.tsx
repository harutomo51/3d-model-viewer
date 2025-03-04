'use client';

import { useState } from 'react';
import styles from './page.module.css';
import dynamic from 'next/dynamic';

// ModelViewerコンポーネントをクライアントサイドでのみレンダリングするために動的インポートを使用
const ModelViewer = dynamic(() => import('../components/ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className={styles.loadingContainer}>
      <p>ローディング中...</p>
    </div>
  ),
});

export default function Home() {
  const [modelUrl, setModelUrl] = useState<string | null>(null);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.viewerContainer}>
          <ModelViewer width="100%" height="700px" modelUrl={modelUrl || undefined} />
        </div>
      </main>
      <footer className={styles.footer}>
        <p>© 2025 3Dモデルビューアー</p>
      </footer>
    </div>
  );
}
