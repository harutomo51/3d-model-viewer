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
        <h1 className={styles.title}>3Dモデルビューアー</h1>
        <p className={styles.description}>
          GLB、GLTF、OBJ、FBXファイル形式に対応しています
        </p>

        <div className={styles.viewerContainer}>
          <ModelViewer width="100%" height="700px" modelUrl={modelUrl || undefined} />
        </div>

        <div className={styles.instructions}>
          <h2>使い方</h2>
          <ul>
            <li>3Dモデルファイルをドラッグ＆ドロップするか、「ファイルを選択」ボタンをクリックしてファイルを選択してください。</li>
            <li>マウスでモデルを回転させることができます（左クリック＋ドラッグ）。</li>
            <li>ホイールでズームイン/アウトができます。</li>
            <li>右クリック＋ドラッグでモデルを移動できます。</li>
          </ul>
        </div>
      </main>
      <footer className={styles.footer}>
        <p>© 2025 3Dモデルビューアー</p>
      </footer>
    </div>
  );
}
