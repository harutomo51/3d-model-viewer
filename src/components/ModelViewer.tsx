import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, useFBX, useTexture, Environment, Stage } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { PerspectiveCamera } from 'three';

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

// メインのモデルビューアーコンポーネント
interface ModelViewerProps {
  modelUrl?: string;
  width?: string;
  height?: string;
}

const ModelViewer: React.FC<ModelViewerProps> = ({
  modelUrl,
  width = '100%',
  height = '500px',
}) => {
  const [url, setUrl] = useState<string | null>(modelUrl || null);
  const [type, setType] = useState<ModelType | null>(modelUrl ? getModelType(modelUrl) : null);
  const [mtlUrl, setMtlUrl] = useState<string | null>(null);
  const [showBones, setShowBones] = useState<boolean>(false);
  const [environmentPreset, setEnvironmentPreset] = useState<string>('city');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mtlInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const fileType = getModelType(file.name);
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        setType(fileType);
        
        // OBJファイルの場合、MTLファイルも探す
        if (fileType === 'obj') {
          // 同じフォルダから同名の.mtlファイルを自動検出する試み
          const mtlFileName = file.name.replace(/\.obj$/i, '.mtl');
          const mtlFile = Array.from(event.target.files || []).find(f => f.name.toLowerCase() === mtlFileName.toLowerCase());
          
          if (mtlFile) {
            const mtlObjectUrl = URL.createObjectURL(mtlFile);
            setMtlUrl(mtlObjectUrl);
          } else {
            setMtlUrl(null);
          }
        }
      } catch (error) {
        alert(error);
      }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    
    // ドロップされたすべてのファイルを取得
    const files = Array.from(event.dataTransfer.files);
    
    // OBJファイルとMTLファイルを探す
    const objFile = files.find(file => file.name.toLowerCase().endsWith('.obj'));
    
    if (objFile) {
      try {
        const objectUrl = URL.createObjectURL(objFile);
        setUrl(objectUrl);
        setType('obj');
        
        // 同じ名前のMTLファイルを探す
        const mtlFileName = objFile.name.replace(/\.obj$/i, '.mtl');
        const mtlFile = files.find(file => file.name.toLowerCase() === mtlFileName.toLowerCase());
        
        if (mtlFile) {
          const mtlObjectUrl = URL.createObjectURL(mtlFile);
          setMtlUrl(mtlObjectUrl);
        } else {
          setMtlUrl(null);
        }
      } catch (error) {
        alert(error);
      }
    } else {
      // OBJファイルがない場合は最初のファイルを使用
      const file = files[0];
      if (file) {
        try {
          const fileType = getModelType(file.name);
          const objectUrl = URL.createObjectURL(file);
          setUrl(objectUrl);
          setType(fileType);
          setMtlUrl(null); // OBJ以外の場合はMTLをクリア
        } catch (error) {
          alert(error);
        }
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '8px',
        border: '2px dashed #ccc',
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {url && type ? (
        <>
          <Canvas camera={{ position: [0, 0, 10], fov: 45, near: 0.1, far: 1000 }}>
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
            <pointLight position={[-10, -10, -10]} />
            <Suspense fallback={null}>
              {(type === 'glb' || type === 'gltf') ? (
                <ModelLoader url={url} type={type} mtlUrl={mtlUrl} showBones={showBones} environmentPreset={environmentPreset} />
              ) : (
                <Stage environment="city" intensity={0.6} adjustCamera={false}>
                  <ModelLoader url={url} type={type} mtlUrl={mtlUrl} showBones={showBones} />
                </Stage>
              )}
            </Suspense>
            <OrbitControls makeDefault enablePan={true} enableZoom={true} enableRotate={true} />
          </Canvas>
          
          {type === 'fbx' && (
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.5)',
                padding: '8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                color: 'white',
              }}
            >
              <label style={{ marginRight: '8px', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={showBones}
                  onChange={(e) => setShowBones(e.target.checked)}
                  style={{ marginRight: '4px' }}
                />
                ボーンを表示
              </label>
            </div>
          )}
          
          {(type === 'glb' || type === 'gltf') && (
            <div
              style={{
                position: 'absolute',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.5)',
                padding: '8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                color: 'white',
              }}
            >
              <label style={{ marginRight: '8px', userSelect: 'none' }}>
                環境マップ:
                <select
                  value={environmentPreset}
                  onChange={(e) => setEnvironmentPreset(e.target.value)}
                  style={{
                    marginLeft: '8px',
                    padding: '4px',
                    borderRadius: '4px',
                    background: '#333',
                    color: 'white',
                    border: '1px solid #555',
                  }}
                >
                  {environmentPresets.map((preset) => (
                    <option key={preset} value={preset}>
                      {preset}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <p>ここにモデルファイルをドラッグ＆ドロップするか、ファイルを選択してください</p>
          <p>対応形式: GLB, GLTF, OBJ, FBX</p>
          <button
            onClick={handleButtonClick}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginTop: '10px',
            }}
          >
            ファイルを選択
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".glb,.gltf,.obj,.fbx,.mtl"
            multiple
            style={{ display: 'none' }}
          />
        </div>
      )}
    </div>
  );
};

export default ModelViewer; 