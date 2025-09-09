
import React, { useState, useCallback } from 'react';
import { PetInfo, DesignConfig, Shape } from './types';
import { useThreeScene } from './hooks/useThreeScene';

// Declare QRCode and THREE to be available from the CDN scripts
declare const QRCode: any;
declare const THREE: any;

const initialPetInfo: PetInfo = {
    petName: '', petType: '', petBreed: '', features: [],
    ownerName: '', phone: '', email: '', medicalInfo: '', otherInfo: '',
};

const initialDesignConfig: DesignConfig = {
    shape: Shape.Circle,
    thickness: 4,
    size: 50,
};

const petFeaturesList = ["Microchip", "Esterilizado/a", "Vacunado/a", "Tímido/a", "Amigable", "Necesita Medicación"];

// Mapping for shape names (UI labels and titles)
const shapeTranslations: { [key in Shape]: { label: string; title: string } } = {
    [Shape.Circle]: { label: 'Círculo', title: 'círculo' },
    [Shape.Bone]: { label: 'Hueso', title: 'hueso' },
    [Shape.Heart]: { label: 'Corazón', title: 'corazón' },
    [Shape.Square]: { label: 'Cuadrado', title: 'cuadrado' },
};


// --- UI Components ---

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}
const Input: React.FC<InputProps> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" {...props} />
    </div>
);

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
}
const TextArea: React.FC<TextAreaProps> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" rows={3} {...props}></textarea>
    </div>
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    children: React.ReactNode;
}
const Select: React.FC<SelectProps> = ({ label, children, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select className="w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" {...props}>
            {children}
        </select>
    </div>
);


const Header: React.FC = () => (
    <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-indigo-700 tracking-tight">Generador de Placas QR 3D para Mascotas</h1>
            <p className="mt-2 text-lg text-gray-600">Diseña y crea placas con código QR imprimibles en 3D para tu querida mascota.</p>
        </div>
    </header>
);

// --- Main App Component ---

const App: React.FC = () => {
    const [petInfo, setPetInfo] = useState<PetInfo>(initialPetInfo);
    const [designConfig, setDesignConfig] = useState<DesignConfig>(initialDesignConfig);
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const { mountRef, updateModel, getObjectForExport } = useThreeScene(designConfig);

    const handlePetInfoChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setPetInfo(prev => ({ ...prev, [name]: value }));
    }, []);

    const handleFeatureChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        setPetInfo(prev => {
            const features = checked ? [...prev.features, value] : prev.features.filter(f => f !== value);
            return { ...prev, features };
        });
    }, []);

    const handleDesignChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDesignConfig(prev => ({ ...prev, [name]: parseFloat(value) }));
    }, []);

    const handleShapeChange = useCallback((shape: Shape) => {
        setDesignConfig(prev => ({ ...prev, shape }));
    }, []);

    const generateQrCode = useCallback(async () => {
        if (!petInfo.petName || !petInfo.ownerName || !petInfo.phone) {
            alert('Por favor, completa todos los campos obligatorios (*)');
            return;
        }
        setIsLoading(true);

        let qrText = `INFO MASCOTA\nNombre: ${petInfo.petName}\nTipo: ${petInfo.petType}\n`;
        if (petInfo.petBreed) qrText += `Raza: ${petInfo.petBreed}\n`;
        if (petInfo.features.length) qrText += `Características: ${petInfo.features.join(', ')}\n`;
        qrText += `DUEÑO\nNombre: ${petInfo.ownerName}\nTeléfono: +54 ${petInfo.phone}\n`;
        if (petInfo.email) qrText += `Email: ${petInfo.email}\n`;
        if (petInfo.medicalInfo) qrText += `Info Médica: ${petInfo.medicalInfo}\n`;
        if (petInfo.otherInfo) qrText += `Notas: ${petInfo.otherInfo}`;

        try {
            const url = await QRCode.toDataURL(qrText, { width: 512, margin: 2 });
            setQrCodeUrl(url);
            updateModel(url);
        } catch (err) {
            console.error(err);
            alert('Error al generar el código QR.');
        } finally {
            setIsLoading(false);
        }
    }, [petInfo, updateModel]);
    
    const downloadFile = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const downloadSTL = useCallback(() => {
        const qrObject = getObjectForExport();
        if (!qrObject) return;
        
        const exporter = new THREE.STLExporter();
        
        // Save current rotation to restore it after export
        const originalRotation = qrObject.rotation.clone();
        
        // Reset rotation to the default orientation for a clean export
        qrObject.rotation.set(-Math.PI / 2, 0, 0);
        
        // Generate STL data from the model
        const stlData = exporter.parse(qrObject, { binary: true });
        
        // Restore the original rotation so the animation continues smoothly
        qrObject.rotation.copy(originalRotation);

        const blob = new Blob([stlData], { type: 'application/octet-stream' });
        downloadFile(blob, `${petInfo.petName || 'mascota'}-placa-qr.stl`);
    }, [getObjectForExport, petInfo.petName]);
    
    const downloadPNG = useCallback(() => {
        if (!qrCodeUrl) return;
        fetch(qrCodeUrl)
            .then(res => res.blob())
            .then(blob => {
                 downloadFile(blob, `${petInfo.petName || 'mascota'}-codigo-qr.png`);
            });
    }, [qrCodeUrl, petInfo.petName]);


    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <Header />
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    
                    {/* Left Column: Form */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">1. Información de la Mascota y Dueño</h2>
                            <div className="space-y-4">
                                <Input label="Nombre de la Mascota *" name="petName" value={petInfo.petName} onChange={handlePetInfoChange} required title="Ingresa el nombre de tu mascota. Este campo es obligatorio." />
                                <Select label="Tipo de Mascota *" name="petType" value={petInfo.petType} onChange={handlePetInfoChange} required title="Selecciona el tipo de tu mascota (ej. Perro, Gato).">
                                    <option value="">Selecciona un tipo</option>
                                    <option>Perro</option><option>Gato</option><option>Conejo</option><option>Ave</option><option>Otro</option>
                                </Select>
                                <Input label="Raza (Opcional)" name="petBreed" value={petInfo.petBreed} onChange={handlePetInfoChange} title="Ingresa la raza de tu mascota, si aplica." />
                                <div title="Selecciona cualquier característica relevante de tu mascota.">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Características Especiales</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {petFeaturesList.map(feature => (
                                            <label key={feature} className="flex items-center space-x-2 text-sm">
                                                <input type="checkbox" name="features" value={feature} checked={petInfo.features.includes(feature)} onChange={handleFeatureChange} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                                                <span>{feature}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <Input label="Nombre del Dueño *" name="ownerName" value={petInfo.ownerName} onChange={handlePetInfoChange} required title="Ingresa tu nombre completo. Este campo es obligatorio." />
                                <div className="flex items-end">
                                    <span className="inline-flex items-center px-3 h-[38px] rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">+54</span>
                                    <Input label="Teléfono de Contacto *" name="phone" value={petInfo.phone} onChange={handlePetInfoChange} type="tel" required title="Ingresa un número de teléfono donde puedan contactarte. Este campo es obligatorio." className="rounded-l-none"/>
                                </div>
                                <Input label="Email de Contacto (Opcional)" name="email" value={petInfo.email} onChange={handlePetInfoChange} type="email" title="Ingresa una dirección de correo electrónico de contacto (opcional)." />
                                <TextArea label="Información Médica Importante" name="medicalInfo" value={petInfo.medicalInfo} onChange={handlePetInfoChange} title="Enumera cualquier condición médica importante, alergias o medicación requerida." />
                                <TextArea label="Otra Información Relevante" name="otherInfo" value={petInfo.otherInfo} onChange={handlePetInfoChange} title="Añade cualquier otra nota, como rasgos de personalidad, hábitos o dónde fue vista la mascota por última vez." />
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">2. Diseño de la Placa 3D</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Forma de la Base</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(Object.values(Shape) as Array<Shape>).map(s => (
                                            <button key={s} onClick={() => handleShapeChange(s)} title={`Selecciona una forma de ${shapeTranslations[s].title} para la placa.`} className={`py-2 px-4 rounded-md text-sm transition-colors ${designConfig.shape === s ? 'bg-indigo-600 text-white shadow' : 'bg-gray-200 hover:bg-gray-300'}`}>{shapeTranslations[s].label}</button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Grosor: <span className="font-bold">{designConfig.thickness} mm</span></label>
                                    <input type="range" name="thickness" min="2" max="10" step="0.5" value={designConfig.thickness} onChange={handleDesignChange} title="Ajusta el grosor total de la placa en milímetros." className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tamaño: <span className="font-bold">{designConfig.size} mm</span></label>
                                    <input type="range" name="size" min="30" max="80" value={designConfig.size} onChange={handleDesignChange} title="Ajusta el diámetro o ancho de la placa en milímetros." className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                </div>
                            </div>
                        </div>

                        <button onClick={generateQrCode} disabled={isLoading} title="Haz clic para generar el código QR 2D y previsualizar el modelo 3D basado en tus datos." className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300">
                            {isLoading ? 'Generando...' : 'Generar Placa QR 3D'}
                        </button>
                    </div>

                    {/* Right Column: Preview */}
                    <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-lg space-y-6">
                        <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">3. Vista Previa y Descarga</h2>
                        <div className="w-full aspect-video bg-indigo-100 rounded-lg overflow-hidden" ref={mountRef}></div>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <div className="p-4 bg-white border rounded-lg shadow-sm">
                                {qrCodeUrl ? <img src={qrCodeUrl} alt="Código QR generado" className="w-32 h-32" /> : <div className="w-32 h-32 bg-gray-100 flex items-center justify-center text-center text-xs text-gray-500">Vista Previa QR 2D</div>}
                            </div>
                            <div className="flex flex-col gap-3">
                                <button onClick={downloadSTL} disabled={!qrCodeUrl} title="Descarga el archivo del modelo 3D (.stl), que puede ser usado con una impresora 3D." className="py-2 px-5 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed">Descargar Archivo .STL</button>
                                <button onClick={downloadPNG} disabled={!qrCodeUrl} title="Descarga el código QR 2D como un archivo de imagen estándar (.png), útil para compartir o imprimir en papel." className="py-2 px-5 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed">Descargar Imagen .PNG</button>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                             <h3 className="font-bold text-gray-700 mb-2">Instrucciones de Impresión 3D:</h3>
                             <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                                 <li>Descarga el archivo .STL usando el botón de arriba.</li>
                                 <li>Abre el archivo en tu programa de laminado 3D preferido (ej. Cura, PrusaSlicer).</li>
                                 <li>Coloca el modelo plano sobre la base de impresión con el código QR hacia arriba.</li>
                                 <li>Altura de capa recomendada: 0.1mm - 0.2mm para el mejor detalle.</li>
                                 <li>Relleno: 20-30% es suficiente.</li>
                                 <li>Material: PLA o PETG son ideales para mayor durabilidad.</li>
                                 <li>Considera un cambio de color de filamento en las capas superiores para que el código QR resalte.</li>
                             </ol>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
