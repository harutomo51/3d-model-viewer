import React, { useRef, useState, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, useFBX, useTexture, Environment, Stage } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { PerspectiveCamera } from 'three';
import { SkeletonHelper } from 'three';

// モデルの種類を定義
type ModelType = 'gltf' | 'glb' | 'obj' | 'fbx';

// モデルローダーのプロパティ
interface ModelLoaderProps {
  url: string;
  type: ModelType;
  mtlUrl?: string | null;
  showBones?: boolean;
  environmentPreset?: string;
}

// OBJモデルをロードするコンポーネント
const OBJModel = ({ url, mtlUrl }: { url: string; mtlUrl?: string | null }) => {
  const [model, setModel] = useState<THREE.Group | null>(null);
  const { scene, camera } = useThree();

  useEffect(() => {
    // OBJLoader インスタンスを作成
    const objLoader = new OBJLoader();
    
    // MTLファイルをロードしてからOBJをロードする関数
    const loadWithMaterial = (materialUrl: string) => {
      const mtlLoader = new MTLLoader();
      mtlLoader.load(
        materialUrl,
        (materials) => {
          materials.preload();
          objLoader.setMaterials(materials);
          loadObj();
        },
        undefined,
        (error) => {
          console.warn('MTLファイルのロードに失敗しました:', error);
          // MTLが見つからない場合は、デフォルトマテリアルでOBJをロード
          loadObj();
        }
      );
    };
    
    // OBJファイルをロードする関数
    const loadObj = () => {
      objLoader.load(
        url,
        (obj) => {
          // MTLが見つからなかった場合のデフォルトマテリアル設定
          if (!objLoader.materials) {
            obj.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.material = new THREE.MeshStandardMaterial({
                  color: 0xcccccc,
                  roughness: 0.5,
                  metalness: 0.5,
                });
              }
            });
          }
          
          // モデルのバウンディングボックスを計算
          const box = new THREE.Box3().setFromObject(obj);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          
          // モデルの中心を原点に移動
          obj.position.x = -center.x;
          obj.position.y = -center.y;
          obj.position.z = -center.z;
          
          // カメラの位置を調整
          const maxDim = Math.max(size.x, size.y, size.z);
          if (camera instanceof PerspectiveCamera) {
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
            
            // 少し余裕を持たせる
            cameraZ *= 1.5;
            
            camera.position.z = cameraZ;
            
            // near/farの設定も調整
            const minZ = 0.1;
            const maxZ = cameraZ * 10;
            camera.near = minZ;
            camera.far = maxZ;
            camera.updateProjectionMatrix();
          }
          
          setModel(obj);
        },
        (xhr) => {
          console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
        },
        (error) => {
          console.error('OBJファイルのロードに失敗しました:', error);
        }
      );
    };
    
    // MTLファイルが指定されている場合は、それを使用
    if (mtlUrl) {
      loadWithMaterial(mtlUrl);
    } else {
      // MTLファイルが指定されていない場合は、OBJファイルと同名のMTLファイルを探す
      const autoMtlUrl = url.replace(/\.obj$/i, '.mtl');
      
      // 同じURLパターンでMTLファイルが存在するか試してみる
      // ただし、これはサーバー上のファイルの場合のみ機能する
      if (url.startsWith('http') || url.startsWith('/')) {
        fetch(autoMtlUrl, { method: 'HEAD' })
          .then(response => {
            if (response.ok) {
              // MTLファイルが存在する場合
              loadWithMaterial(autoMtlUrl);
            } else {
              // MTLファイルが存在しない場合
              loadObj();
            }
          })
          .catch(() => {
            // ネットワークエラーなどの場合はデフォルトマテリアルでロード
            loadObj();
          });
      } else {
        // ローカルファイルの場合は直接OBJをロード
        loadObj();
      }
    }

    return () => {
      if (model) {
        scene.remove(model);
      }
    };
  }, [url, mtlUrl, scene, camera]);

  return model ? <primitive object={model} /> : null;
};

// FBXモデルをロードするコンポーネント
const FBXModel = ({ url, showBones = false }: { url: string; showBones?: boolean }) => {
  const fbx = useFBX(url);
  const { camera, scene } = useThree();
  const skeletonRef = useRef<THREE.SkeletonHelper | null>(null);
  
  // ボーンの検出とスケルトンヘルパーの作成
  useEffect(() => {
    if (fbx) {
      // モデルのバウンディングボックスを計算
      const box = new THREE.Box3().setFromObject(fbx);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      
      // モデルの中心を原点に移動
      fbx.position.x = -center.x;
      fbx.position.y = -center.y;
      fbx.position.z = -center.z;
      
      // カメラの位置を調整
      const maxDim = Math.max(size.x, size.y, size.z);
      if (camera instanceof PerspectiveCamera) {
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
        
        // 少し余裕を持たせる
        cameraZ *= 1.5;
        
        camera.position.z = cameraZ;
        
        // near/farの設定も調整
        const minZ = 0.1;
        const maxZ = cameraZ * 10;
        camera.near = minZ;
        camera.far = maxZ;
        camera.updateProjectionMatrix();
      }
    }
  }, [fbx, camera]);
  
  // ボーンの表示/非表示を制御する別のuseEffect
  useEffect(() => {
    if (fbx && scene) {
      // 既存のスケルトンヘルパーをクリーンアップ
      if (skeletonRef.current) {
        scene.remove(skeletonRef.current);
        skeletonRef.current = null;
      }
      
      // ボーンがあり、表示フラグがオンの場合はスケルトンヘルパーを作成
      if (showBones) {
        // ボーンを持つオブジェクトを探す
        let hasBones = false;
        fbx.traverse((object) => {
          // THREE.Meshかつボーンを持つオブジェクトを検出
          // @ts-ignore - skeletonプロパティはTypeScriptの型定義に含まれていないが実際には存在する
          if (object instanceof THREE.Mesh && object.skeleton) {
            hasBones = true;
          }
        });
        
        if (hasBones) {
          const newSkeleton = new THREE.SkeletonHelper(fbx);
          newSkeleton.visible = true;
          scene.add(newSkeleton);
          skeletonRef.current = newSkeleton;
        }
      }
    }
    
    return () => {
      // コンポーネントのアンマウント時にスケルトンヘルパーをクリーンアップ
      if (skeletonRef.current && scene) {
        scene.remove(skeletonRef.current);
        skeletonRef.current = null;
      }
    };
  }, [fbx, scene, showBones]); // showBonesの変更時のみ実行
  
  return <primitive object={fbx} />;
};

// GLTF/GLBモデルをロードするコンポーネント
const GLTFModel = ({ url, environmentPreset = 'city' }: { url: string; environmentPreset?: string }) => {
  const { scene: model } = useGLTF(url);
  const { camera } = useThree();
  
  useEffect(() => {
    if (model) {
      // モデルのバウンディングボックスを計算
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      
      // モデルの中心を原点に移動
      model.position.x = -center.x;
      model.position.y = -center.y;
      model.position.z = -center.z;
      
      // カメラの位置を調整
      const maxDim = Math.max(size.x, size.y, size.z);
      if (camera instanceof PerspectiveCamera) {
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
        
        // 少し余裕を持たせる
        cameraZ *= 1.5;
        
        camera.position.z = cameraZ;
        
        // near/farの設定も調整
        const minZ = 0.1;
        const maxZ = cameraZ * 10;
        camera.near = minZ;
        camera.far = maxZ;
        camera.updateProjectionMatrix();
      }
    }
  }, [model, camera]);
  
  return (
    <>
      <Environment preset={environmentPreset as any} />
      <primitive object={model} />
    </>
  );
};

// モデルローダーコンポーネント
const ModelLoader = ({ url, type, mtlUrl, showBones, environmentPreset }: ModelLoaderProps) => {
  switch (type) {
    case 'obj':
      return <OBJModel url={url} mtlUrl={mtlUrl} />;
    case 'fbx':
      return <FBXModel url={url} showBones={showBones} />;
    case 'gltf':
    case 'glb':
      return <GLTFModel url={url} environmentPreset={environmentPreset} />;
    default:
      return null;
  }
};

// ファイル拡張子からモデルタイプを判定する関数
const getModelType = (filename: string): ModelType => {
  const extension = filename.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'obj':
      return 'obj';
    case 'fbx':
      return 'fbx';
    case 'gltf':
      return 'gltf';
    case 'glb':
      return 'glb';
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
};

// 環境マッププリセットのリスト
const environmentPresets = [
  'sunset',
  'dawn',
  'night',
  'warehouse',
  'forest',
  'apartment',
  'studio',
  'city',
  'park',
  'lobby'
];

// モデル情報を計算するカスタムフック
const useModelInfo = (scene: THREE.Scene) => {
  const [polygonCount, setPolygonCount] = useState<number>(0);
  
  // モデルのポリゴン数を計算
  useEffect(() => {
    let totalPolygons = 0;
    
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const geometry = object.geometry;
        if (geometry.index !== null) {
          // インデックス付きジオメトリの場合
          totalPolygons += geometry.index.count / 3;
        } else if (geometry.attributes.position) {
          // インデックスなしジオメトリの場合
          totalPolygons += geometry.attributes.position.count / 3;
        }
      }
    });
    
    setPolygonCount(Math.round(totalPolygons));
  }, [scene]);
  
  return { polygonCount };
};

// モデル情報を表示するコンポーネント
const ModelInfoDisplay = () => {
  const { scene } = useThree();
  const { polygonCount } = useModelInfo(scene);
  
  return null; // 実際の表示はModelViewerコンポーネントで行う
};

// キャンバスのリサイズを処理するカスタムコンポーネント
const CanvasResizer = () => {
  const { gl, camera } = useThree();
  
  useEffect(() => {
    const handleResize = () => {
      // レンダラーのサイズを更新
      gl.setSize(window.innerWidth, window.innerHeight);
      
      // カメラのアスペクト比を更新
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
      }
    };
    
    // 初期サイズを設定
    handleResize();
    
    // リサイズイベントリスナーを追加
    window.addEventListener('resize', handleResize);
    
    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [gl, camera]);
  
  return null;
};

// メインのモデルビューアーコンポーネント
interface ModelViewerProps {
  modelUrl?: string;
  width?: string;
  height?: string;
}

const ModelViewer: React.FC<ModelViewerProps> = ({
  modelUrl,
  width = '100%',
  height = '100%',
}) => {
  const [url, setUrl] = useState<string | null>(modelUrl || null);
  const [type, setType] = useState<ModelType | null>(null);
  const [showBones, setShowBones] = useState<boolean>(false);
  const [environmentPreset, setEnvironmentPreset] = useState<string>('city');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [polygonCount, setPolygonCount] = useState<number>(0);

  // ポリゴン数を更新する関数
  const updatePolygonCount = useCallback((count: number) => {
    setPolygonCount(count);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileName(file.name);
    setFileSize(file.size); // ファイルサイズを保存
    
    const fileType = getModelType(file.name);
    
    if (fileType) {
      const objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);
      setType(fileType);
    } else {
      alert('サポートされていないファイル形式です。');
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      setFileName(file.name);
      setFileSize(file.size); // ファイルサイズを保存
      
      const fileType = getModelType(file.name);
      
      if (fileType) {
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        setType(fileType);
      } else {
        alert('サポートされていないファイル形式です。');
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // ポリゴン数を監視するコンポーネント
  const PolygonCounter = () => {
    const { scene } = useThree();
    
    useEffect(() => {
      let totalPolygons = 0;
      
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          const geometry = object.geometry;
          if (geometry.index !== null) {
            // インデックス付きジオメトリの場合
            totalPolygons += geometry.index.count / 3;
          } else if (geometry.attributes.position) {
            // インデックスなしジオメトリの場合
            totalPolygons += geometry.attributes.position.count / 3;
          }
        }
      });
      
      updatePolygonCount(Math.round(totalPolygons));
    }, [scene]);
    
    return null;
  };

  // ファイルサイズを人間が読みやすい形式に変換する関数
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* モデル情報を右上に表示 */}
      {url && type && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '14px',
            fontFamily: 'monospace',
          }}
        >
          <div>ファイル名: {fileName}</div>
          <div>ファイルサイズ: {formatFileSize(fileSize)}</div>
          <div>ポリゴン数: {polygonCount.toLocaleString()} ポリゴン</div>
        </div>
      )}

      {url && type ? (
        <Canvas
          camera={{ position: [0, 0, 10], fov: 45 }}
          style={{ 
            background: '#222222',
            width: '100%',
            height: '100%',
          }}
          gl={{ antialias: true }}
          dpr={[1, 2]}
        >
          <CanvasResizer />
          <PolygonCounter />
          <ambientLight intensity={0.7} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />
          <Suspense fallback={null}>
            {(type === 'glb' || type === 'gltf') ? (
              <ModelLoader url={url} type={type} showBones={showBones} environmentPreset={environmentPreset} />
            ) : (
              <Stage environment="city" intensity={0.8} adjustCamera={false}>
                <ModelLoader url={url} type={type} showBones={showBones} />
              </Stage>
            )}
          </Suspense>
          <OrbitControls makeDefault />
        </Canvas>
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#222222',
            border: '2px dashed #555',
            borderRadius: '8px',
          }}
        >
          <p style={{ color: '#ffffff' }}>3Dモデルをドラッグ＆ドロップするか、ファイルを選択してください</p>
        </div>
      )}

      {/* ファイル選択ボタンと現在のファイル名を左下に常に表示 */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <button
          onClick={handleButtonClick}
          style={{
            background: 'rgba(74, 144, 226, 0.7)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          ファイルを選択
        </button>
        {fileName && (
          <span style={{ 
            background: 'rgba(255, 255, 255, 0.3)',
            color: 'white',
            padding: '5px 10px', 
            borderRadius: '4px',
            maxWidth: '300px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {fileName}
          </span>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept=".glb,.gltf,.obj,.fbx"
        />
      </div>

      {url && type && (
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: fileName ? '400px' : '150px',
            zIndex: 100,
            display: 'flex',
            gap: '10px',
          }}
        >
          {type === 'fbx' && (
            <label style={{ 
              color: 'white',
              background: 'rgba(74, 144, 226, 0.7)',
              padding: '5px', 
              borderRadius: '4px' 
            }}>
              <input
                type="checkbox"
                checked={showBones}
                onChange={(e) => setShowBones(e.target.checked)}
              />
              ボーンを表示
            </label>
          )}

          {(type === 'glb' || type === 'gltf') && (
            <select
              value={environmentPreset}
              onChange={(e) => setEnvironmentPreset(e.target.value)}
              style={{
                padding: '5px',
                borderRadius: '4px',
                border: 'none',
                background: 'rgba(74, 144, 226, 0.7)',
                color: 'white',
              }}
            >
              <option value="sunset">夕暮れ</option>
              <option value="dawn">夜明け</option>
              <option value="night">夜</option>
              <option value="warehouse">倉庫</option>
              <option value="forest">森</option>
              <option value="apartment">アパート</option>
              <option value="studio">スタジオ</option>
              <option value="city">都市</option>
              <option value="park">公園</option>
              <option value="lobby">ロビー</option>
            </select>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelViewer; 