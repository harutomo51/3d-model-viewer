# 3Dモデルビューアー

Next.jsとThree.jsを使用した3Dモデルビューアーアプリケーションです。GLB、GLTF、OBJ、FBXファイル形式に対応しています。

## 機能

- 複数の3Dファイル形式（GLB、GLTF、OBJ、FBX）のサポート
- ドラッグ＆ドロップによるファイルアップロード
- ファイル選択ダイアログによるファイルアップロード
- 3Dモデルの回転、ズーム、移動機能
- レスポンシブデザイン

## 技術スタック

- [Next.js](https://nextjs.org/) - Reactフレームワーク
- [Three.js](https://threejs.org/) - 3Dグラフィックスライブラリ
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber) - Three.jsのReactレンダラー
- [React Three Drei](https://github.com/pmndrs/drei) - React Three Fiberのヘルパーコンポーネント
- [TypeScript](https://www.typescriptlang.org/) - 型付きJavaScript

## 始め方

### 前提条件

- Node.js 18.0.0以上
- npm 9.0.0以上

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/3d-model-viewer.git
cd 3d-model-viewer

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## 使い方

1. アプリケーションにアクセスします。
2. 3Dモデルファイル（GLB、GLTF、OBJ、FBX）をドラッグ＆ドロップするか、「ファイルを選択」ボタンをクリックしてファイルを選択します。
3. モデルが表示されたら、以下の操作が可能です：
   - 左クリック＋ドラッグ：モデルを回転
   - ホイール：ズームイン/アウト
   - 右クリック＋ドラッグ：モデルを移動

## ライセンス

[MIT](LICENSE)

## 謝辞

- [Three.js](https://threejs.org/)
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber)
- [React Three Drei](https://github.com/pmndrs/drei)
