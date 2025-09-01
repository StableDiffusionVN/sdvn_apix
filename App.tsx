/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generatePatrioticImage } from './services/geminiService';
import PolaroidCard from './components/PolaroidCard';
import Footer from './components/Footer';

// Declare JSZip for creating zip files
declare const JSZip: any;


const IDEAS_BY_CATEGORY = [
    {
        category: "Khoảnh Khắc Tự Hào",
        ideas: [
            'Tung bay tà áo dài và lá cờ đỏ',
            'Nụ cười rạng rỡ bên lá cờ Tổ quốc',
            'Chào cờ trang nghiêm ở Quảng trường Ba Đình',
            'Ánh mắt tự hào hướng về lá cờ',
            'Dạo bước trên con đường cờ hoa rực rỡ',
            'Tự tin check-in tại Cột cờ Lũng Cú',
            'Tay trong tay cùng người lính hải quân',
            'Vẻ đẹp kiêu hãnh trước Lăng Bác',
            'Giọt lệ hạnh phúc khi quốc ca vang lên',
            'Gửi gắm tình yêu nơi cột mốc Trường Sa',
            'Thiếu nữ với bó hoa sen và cờ đỏ',
            'Vẫy cao lá cờ chiến thắng',
            'Gia đình nhỏ bên lá cờ Tổ quốc',
            'Khoảnh khắc đời thường dưới bóng cờ',
            'Áo dài đỏ tung bay trên phố cổ'
        ],
    },
    {
        category: "Biểu tượng & Văn hóa",
        ideas: ['Áo dài đỏ sao vàng', 'Bên cạnh hoa sen hồng', 'Họa tiết trống đồng Đông Sơn', 'Đội nón lá truyền thống', 'Vẽ mặt hình cờ đỏ sao vàng', 'Cầm cành đào ngày Tết', 'Bên cạnh cây mai vàng', 'Áo dài trắng nữ sinh', 'Múa lân sư rồng', 'Chơi đàn T\'rưng', 'Thả đèn hoa đăng', 'Nghệ nhân gốm Bát Tràng', 'Vẻ đẹp thiếu nữ bên khung cửi', 'Cầm lồng đèn Trung Thu', 'Nghệ thuật múa rối nước'],
    },
    {
        category: "Lịch sử & Anh hùng",
        ideas: ['Chiến sĩ Điện Biên Phủ', 'Nữ tướng Hai Bà Trưng', 'Vua Hùng dựng nước', 'Thanh niên xung phong', 'Chiến sĩ hải quân Trường Sa', 'Anh bộ đội Cụ Hồ', 'Du kích trong rừng', 'Cô gái mở đường', 'Tinh thần bất khuất thời Trần', 'Hình tượng Thánh Gióng', 'Nữ anh hùng Võ Thị Sáu', 'Chân dung thời bao cấp', 'Chiến sĩ giải phóng quân', 'Dân công hỏa tuyến', 'Người lính biên phòng'],
    },
    {
        category: "Phong cảnh & Địa danh",
        ideas: ['Giữa ruộng bậc thang Sapa', 'Trên thuyền ở Vịnh Hạ Long', 'Đứng trước Hồ Gươm, cầu Thê Húc', 'Khám phá hang Sơn Đoòng', 'Cánh đồng lúa chín vàng', 'Vẻ đẹp cao nguyên đá Hà Giang', 'Hoàng hôn trên phá Tam Giang', 'Biển xanh Phú Quốc', 'Chèo thuyền ở Tràng An, Ninh Bình', 'Đi giữa phố cổ Hội An', 'Cột cờ Lũng Cú', 'Dinh Độc Lập lịch sử', 'Nhà thờ Đức Bà Sài Gòn', 'Bên dòng sông Mekong', 'Vẻ đẹp Đà Lạt mộng mơ'],
    },
    {
        category: "Ẩm thực & Đời sống",
        ideas: ['Thưởng thức Phở Hà Nội', 'Uống cà phê sữa đá Sài Gòn', 'Gói bánh chưng ngày Tết', 'Gánh hàng rong phố cổ', 'Ăn bánh mì vỉa hè', 'Không khí chợ nổi Cái Răng', 'Làm nón lá', 'Người nông dân trên đồng', 'Ngư dân kéo lưới', 'Gia đình sum vầy', 'Bên xe máy Dream huyền thoại', 'Uống trà đá vỉa hè', 'Bữa cơm gia đình Việt', 'Làm muối ở Hòn Khói', 'Trồng cây cà phê Tây Nguyên'],
    },
    {
        category: "Nghệ thuật & Sáng tạo",
        ideas: ['Phong cách tranh cổ động', 'Phong cách tranh sơn mài', 'Họa tiết gốm Chu Đậu', 'Nét vẽ tranh Đông Hồ', 'Ánh sáng từ đèn lồng Hội An', 'Nghệ thuật thư pháp', 'Họa tiết thổ cẩm Tây Bắc', 'Phong cách ảnh phim xưa', 'Nghệ thuật điêu khắc Chăm Pa', 'Vẻ đẹp tranh lụa', 'Phong cách Cyberpunk Sài Gòn', 'Hòa mình vào dải ngân hà', 'Họa tiết rồng thời Lý', 'Ánh sáng neon hiện đại', 'Phong cách Low-poly'],
    },
    {
        category: "Thể thao & Tự hào",
        ideas: ['Cổ động viên bóng đá cuồng nhiệt', 'Khoảnh khắc nâng cúp vàng', 'Vận động viên SEA Games', 'Tay đua xe đạp', 'Võ sĩ Vovinam', 'Cầu thủ bóng đá chuyên nghiệp', 'Niềm vui chiến thắng', 'Đi bão sau trận thắng', 'Vận động viên điền kinh', 'Tinh thần thể thao Olympic', 'Tay vợt cầu lông', 'Nữ vận động viên wushu', 'Cờ đỏ trên khán đài', 'Vận động viên bơi lội', 'Huy chương vàng tự hào'],
    },
    {
        category: "Tương lai & Khoa học",
        ideas: ['Phi hành gia cắm cờ Việt Nam', 'Nhà khoa học trong phòng thí nghiệm', 'Kỹ sư công nghệ tương lai', 'Thành phố thông minh', 'Nông nghiệp công nghệ cao', 'Bác sĩ robot y tế', 'Năng lượng mặt trời Việt Nam', 'Khám phá đại dương', 'Chuyên gia trí tuệ nhân tạo', 'Kiến trúc sư công trình xanh'],
    },
];


type ImageStatus = 'pending' | 'done' | 'error';
interface GeneratedImage {
    status: ImageStatus;
    url?: string;
    error?: string;
}

interface HistoricalImage {
    idea: string;
    url: string;
}

const primaryButtonClasses = "font-mali font-bold text-xl text-center text-black bg-yellow-400 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:-rotate-2 hover:bg-yellow-300 shadow-[2px_2px_0px_2px_rgba(0,0,0,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:bg-yellow-400";
const secondaryButtonClasses = "font-mali font-bold text-xl text-center text-white bg-white/10 backdrop-blur-sm border-2 border-white/80 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:rotate-2 hover:bg-white hover:text-black";

const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    }, [matches, query]);
    return matches;
};

// Helper function to convert a data URL to a Blob
const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Invalid data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

function App() {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<Record<string, GeneratedImage>>({});
    const [historicalImages, setHistoricalImages] = useState<HistoricalImage[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [appState, setAppState] = useState<'idle' | 'image-uploaded' | 'generating' | 'results-shown'>('idle');
    const [selectedIdeas, setSelectedIdeas] = useState<string[]>([]);
    const [modifyingIdea, setModifyingIdea] = useState<string | null>(null);
    const [customPrompt, setCustomPrompt] = useState<string>('');
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [settings, setSettings] = useState({
        mainTitle: "Tự hào Việt Nam",
        subtitle: "Tạo avatar thể hiện tình yêu đất nước.",
        minIdeas: 1,
        maxIdeas: 6
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/setting.json');
                if (!response.ok) {
                    console.warn('Could not load setting.json, using default settings.');
                    return;
                }
                const data = await response.json();
                setSettings(prevSettings => ({ ...prevSettings, ...data }));
            } catch (error) {
                console.error("Failed to fetch or parse setting.json:", error);
            }
        };
        fetchSettings();
    }, []);

    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setAppState('image-uploaded');
                setGeneratedImages({}); // Clear previous results
                setSelectedIdeas([]); // Clear selected ideas
                setHistoricalImages([]); // Clear history for new image
            };
            reader.readAsDataURL(file);
        }
    };

    const handleIdeaSelect = (idea: string) => {
        setSelectedIdeas(prev => {
            if (prev.includes(idea)) {
                return prev.filter(p => p !== idea);
            }
            if (prev.length < settings.maxIdeas) {
                return [...prev, idea];
            }
            return prev; // Do nothing if already max selected
        });
    };

    const handleGenerateClick = async () => {
        if (!uploadedImage || selectedIdeas.length < settings.minIdeas || selectedIdeas.length > settings.maxIdeas) return;
        
        setIsLoading(true);
        setAppState('generating');
        
        const ideasToGenerate = selectedIdeas.filter(p => 
            !generatedImages[p] || generatedImages[p].status !== 'done'
        );

        const finalImages = Object.keys(generatedImages)
            .filter(p => selectedIdeas.includes(p))
            .reduce((acc, key) => {
                acc[key] = generatedImages[key];
                return acc;
            }, {} as Record<string, GeneratedImage>);

        if (ideasToGenerate.length === 0) {
            setGeneratedImages(finalImages);
            setIsLoading(false);
            setAppState('results-shown');
            return;
        }
        
        ideasToGenerate.forEach(idea => {
            finalImages[idea] = { status: 'pending' };
        });
        setGeneratedImages(finalImages);

        const concurrencyLimit = 2;
        const ideasQueue = [...ideasToGenerate];

        const processIdea = async (idea: string) => {
            try {
                const resultUrl = await generatePatrioticImage(uploadedImage, idea);
                setGeneratedImages(prev => ({
                    ...prev,
                    [idea]: { status: 'done', url: resultUrl },
                }));
                setHistoricalImages(prev => [...prev, { idea, url: resultUrl }]);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                if (errorMessage.includes("API key not valid")) {
                    setGeneratedImages(prev => ({ ...prev, [idea]: { status: 'error', error: "API Key không hợp lệ." } }));
                } else {
                    setGeneratedImages(prev => ({ ...prev, [idea]: { status: 'error', error: errorMessage } }));
                    console.error(`Failed to generate image for ${idea}:`, err);
                }
            }
        };

        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (ideasQueue.length > 0) {
                const idea = ideasQueue.shift();
                if (idea) {
                    await processIdea(idea);
                }
            }
        });

        await Promise.all(workers);

        setIsLoading(false);
        setAppState('results-shown');
    };

    const handleRegenerateIdea = (idea: string) => {
        if (generatedImages[idea]?.status === 'pending') return;
        setModifyingIdea(idea);
        setCustomPrompt('');
    };

    const handleConfirmRegeneration = async () => {
        if (!uploadedImage || !modifyingIdea) return;
        
        const idea = modifyingIdea;
        const prompt = customPrompt;

        setModifyingIdea(null);
        setCustomPrompt('');

        setGeneratedImages(prev => ({ ...prev, [idea]: { status: 'pending' } }));

        try {
            const resultUrl = await generatePatrioticImage(uploadedImage, idea, prompt);
            setGeneratedImages(prev => ({ ...prev, [idea]: { status: 'done', url: resultUrl } }));
            setHistoricalImages(prev => [...prev, { idea, url: resultUrl }]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            if (errorMessage.includes("API key not valid")) {
                setGeneratedImages(prev => ({ ...prev, [idea]: { status: 'error', error: "API Key không hợp lệ." } }));
            } else {
                setGeneratedImages(prev => ({ ...prev, [idea]: { status: 'error', error: errorMessage } }));
                console.error(`Failed to regenerate image for ${idea}:`, err);
            }
        }
    };
    
    const handleCancelRegeneration = () => {
        setModifyingIdea(null);
        setCustomPrompt('');
    };
    
    const handleReset = () => {
        setUploadedImage(null);
        setGeneratedImages({});
        setSelectedIdeas([]);
        setHistoricalImages([]);
        setAppState('idle');
    };
    
    const handleChooseOtherIdeas = () => {
        setAppState('image-uploaded');
    };

    const handleDownloadIndividualImage = (idea: string) => {
        const image = generatedImages[idea];
        if (image?.status === 'done' && image.url) {
            const link = document.createElement('a');
            link.href = image.url;
            link.download = `vietnamtrongtoi-${idea.replace(/\s+/g, '-').toLowerCase()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDownloadOriginalImage = () => {
        if (uploadedImage) {
            const link = document.createElement('a');
            link.href = uploadedImage;
            link.download = 'anh-goc.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDownloadAll = async () => {
        if (!uploadedImage && historicalImages.length === 0) {
            alert('Không có ảnh nào để tải về.');
            return;
        }

        try {
            const zip = new JSZip();
            const inputFolder = zip.folder('input');
            const outputFolder = zip.folder('output');
            
            if (uploadedImage && inputFolder) {
                const blob = dataURLtoBlob(uploadedImage);
                const fileExtension = blob.type.split('/')[1] || 'jpg';
                inputFolder.file(`anh-goc.${fileExtension}`, blob);
            }
            
            if (outputFolder && historicalImages.length > 0) {
                const imageCounts: Record<string, number> = {};
                for (const img of historicalImages) {
                    const { idea, url } = img;
                    const blob = dataURLtoBlob(url);
                    const fileExtension = blob.type.split('/')[1] || 'jpg';
                    const baseFileName = `vietnamtrongtoi-${idea.replace(/\s+/g, '-').toLowerCase()}`;
                    
                    imageCounts[idea] = (imageCounts[idea] || 0) + 1;
                    
                    const fileName = `${baseFileName}-${imageCounts[idea]}.${fileExtension}`;
                    outputFolder.file(fileName, blob);
                }
            }

            const content = await zip.generateAsync({ type: 'blob' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = 'vietnamtrongtoi-results.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

        } catch (error) {
            console.error('Lỗi khi tạo file zip:', error);
            alert('Đã xảy ra lỗi khi tạo file zip. Vui lòng thử lại.');
        }
    };

    const getButtonText = () => {
        if (isLoading) return 'Đang tạo...';
        if (selectedIdeas.length < settings.minIdeas) return `Chọn ít nhất ${settings.minIdeas} ý tưởng`;
        
        const ideasToGenerateCount = selectedIdeas.filter(p => 
            !generatedImages[p] || generatedImages[p].status !== 'done'
        ).length;

        if (ideasToGenerateCount === 0 && selectedIdeas.length > 0) {
            return "Xem kết quả";
        }

        return `Tạo ảnh`;
    };

    return (
        <main className="text-neutral-200 min-h-screen w-full flex flex-col items-center justify-center p-4 pb-24 overflow-x-hidden relative">
            <div className="z-10 flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
                <AnimatePresence>
                {appState !== 'generating' && appState !== 'results-shown' && (
                <motion.div 
                    className="text-center mb-8"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <h1 className="text-6xl md:text-8xl font-asimovian font-bold text-white [text-shadow:1px_1px_3px_rgba(0,0,0,0.4)] tracking-wider">{settings.mainTitle}</h1>
                    <p className="font-playwrite-ca font-bold text-neutral-200 mt-2 text-xl tracking-wide">{settings.subtitle}</p>
                </motion.div>
                )}
                </AnimatePresence>

                {appState === 'idle' && (
                    <div className="flex flex-col items-center justify-center w-full">
                        <label htmlFor="file-upload" className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                             <PolaroidCard 
                                 caption="Tải ảnh của bạn"
                                 status="done"
                             />
                        </label>
                        <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                        <p className="mt-8 font-mali font-bold text-neutral-300 text-center max-w-xs text-lg">
                            Nhấn vào ảnh polaroid để tải ảnh của bạn và bắt đầu hành trình sáng tạo.
                        </p>
                    </div>
                )}

                {appState === 'image-uploaded' && uploadedImage && (
                    <motion.div 
                        className="flex flex-col items-center gap-6 w-full"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                         <PolaroidCard 
                            imageUrl={uploadedImage} 
                            caption="Ảnh của bạn" 
                            status="done"
                         />

                        <div className="w-full max-w-4xl mx-auto text-center mt-4">
                            <h2 className="font-mali font-bold text-2xl text-neutral-200">Chọn từ {settings.minIdeas} đến {settings.maxIdeas} ý tưởng bạn muốn thử</h2>
                            <p className="text-neutral-400 mb-4">Đã chọn: {selectedIdeas.length}/{settings.maxIdeas}</p>
                            <div className="max-h-[50vh] overflow-y-auto p-4 bg-black/20 backdrop-blur-sm border border-white/10 rounded-lg space-y-6">
                                {IDEAS_BY_CATEGORY.map(categoryObj => (
                                    <div key={categoryObj.category}>
                                        <h3 className="text-xl font-mali font-bold text-yellow-400 text-left mb-3 sticky top-0 bg-black/50 backdrop-blur-sm py-2 -mx-4 px-4 z-10">{categoryObj.category}</h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {categoryObj.ideas.map(p => {
                                                const isSelected = selectedIdeas.includes(p);
                                                return (
                                                    <button 
                                                        key={p}
                                                        onClick={() => handleIdeaSelect(p)}
                                                        className={`font-mali font-bold p-2 rounded-sm text-sm transition-all duration-200 ${
                                                            isSelected 
                                                            ? 'bg-yellow-400 text-black ring-2 ring-yellow-300 scale-105' 
                                                            : 'bg-white/10 text-neutral-300 hover:bg-white/20'
                                                        } ${!isSelected && selectedIdeas.length === settings.maxIdeas ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        disabled={!isSelected && selectedIdeas.length === settings.maxIdeas}
                                                    >
                                                        {p}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                         <div className="flex items-center gap-4 mt-4">
                            <button onClick={handleReset} className={secondaryButtonClasses}>
                                Đổi ảnh khác
                            </button>
                            <button 
                                onClick={handleGenerateClick} 
                                className={primaryButtonClasses}
                                disabled={selectedIdeas.length < settings.minIdeas || selectedIdeas.length > settings.maxIdeas || isLoading}
                            >
                                {getButtonText()}
                            </button>
                         </div>
                    </motion.div>
                )}

                {(appState === 'generating' || appState === 'results-shown') && (
                    <div className="w-full flex-1 flex flex-col items-center justify-center pt-4">
                        <AnimatePresence>
                            {appState === 'results-shown' && (
                                <motion.div
                                    className="text-center"
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <h2 className="font-mali font-bold text-3xl text-neutral-100">Đây là kết quả của bạn!</h2>
                                    <p className="text-neutral-300 mt-1">Bạn có thể tạo lại từng ảnh hoặc tải về máy.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="w-full flex-1 flex items-center overflow-x-auto py-4">
                            <motion.div
                                layout
                                className="flex flex-row flex-nowrap items-center justify-start gap-8 px-8 w-max mx-auto py-4"
                            >
                                {uploadedImage && (
                                    <motion.div
                                        key="original-image"
                                        initial={{ opacity: 0, scale: 0.5, y: 100 }}
                                        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                                        transition={{ type: 'spring', stiffness: 80, damping: 15, delay: -0.15 }}
                                        whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
                                    >
                                        <PolaroidCard
                                            caption="Ảnh gốc"
                                            status="done"
                                            imageUrl={uploadedImage}
                                            onDownload={() => handleDownloadOriginalImage()}
                                            isMobile={isMobile}
                                        />
                                    </motion.div>
                                )}
                                {selectedIdeas.map((idea, index) => {
                                    return (
                                        <motion.div
                                            key={idea}
                                            initial={{ opacity: 0, scale: 0.5, y: 100 }}
                                            animate={{
                                                opacity: 1,
                                                scale: 1,
                                                y: 0,
                                                rotate: 0,
                                            }}
                                            transition={{ type: 'spring', stiffness: 80, damping: 15, delay: index * 0.15 }}
                                            whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
                                        >
                                            <PolaroidCard
                                                caption={idea}
                                                status={generatedImages[idea]?.status || 'pending'}
                                                imageUrl={generatedImages[idea]?.url}
                                                error={generatedImages[idea]?.error}
                                                onShake={handleRegenerateIdea}
                                                onDownload={handleDownloadIndividualImage}
                                                isMobile={isMobile}
                                            />
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </div>

                        <div className="h-28 flex items-center justify-center">
                            {appState === 'results-shown' && (
                                <motion.div
                                    className="flex flex-col sm:flex-row items-center gap-4"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.5 }}
                                >
                                    <button onClick={handleDownloadAll} className={primaryButtonClasses}>
                                        Tải về tất cả
                                    </button>
                                    <button onClick={handleChooseOtherIdeas} className={secondaryButtonClasses}>
                                        Chọn ý tưởng khác
                                    </button>
                                     <button onClick={handleReset} className={secondaryButtonClasses + ' !bg-red-500/20 !border-red-500/80 hover:!bg-red-500 hover:!text-white'}>
                                        Bắt đầu lại
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {modifyingIdea && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleCancelRegeneration}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        aria-modal="true"
                        role="dialog"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-neutral-800 border border-white/20 rounded-lg shadow-2xl p-6 w-full max-w-lg mx-auto flex flex-col gap-4"
                        >
                            <h3 className="font-mali font-bold text-2xl text-yellow-400">Chỉnh sửa ảnh</h3>
                            <p className="text-neutral-300">
                                Thêm yêu cầu để tinh chỉnh ảnh <span className="font-bold text-white">"{modifyingIdea}"</span>.
                            </p>
                            <textarea
                                value={customPrompt}
                                onChange={(e) => setCustomPrompt(e.target.value)}
                                placeholder="Ví dụ: thêm một bông hoa sen, mặc áo dài màu xanh, tóc búi cao..."
                                className="w-full h-28 p-3 bg-neutral-900 border border-neutral-700 rounded-md text-neutral-200 placeholder-neutral-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none transition-shadow"
                                rows={3}
                                aria-label="Yêu cầu chỉnh sửa bổ sung"
                            />
                            <div className="flex justify-end items-center gap-4 mt-2">
                                <button onClick={handleCancelRegeneration} className={secondaryButtonClasses + " !py-2 !px-6 !text-base"}>
                                    Hủy
                                </button>
                                <button onClick={handleConfirmRegeneration} className={primaryButtonClasses + " !py-2 !px-6 !text-base"}>
                                    Tạo lại
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            <Footer />
        </main>
    );
}

export default App;