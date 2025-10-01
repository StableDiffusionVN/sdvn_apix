/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { generateArchitecturalImage } from './architectureIdeatorService';
import { generatePatrioticImage, analyzeAvatarForConcepts } from './avatarCreatorService';
import { generateBabyPhoto, estimateAgeGroup } from './babyPhotoCreatorService';
import { generateDressedModelImage } from './dressTheModelService';
import { restoreOldPhoto } from './photoRestorationService';
import { convertImageToRealistic } from './imageToRealService';
import { swapImageStyle } from './swapStyleService';
import { mixImageStyle } from './mixStyleService';
import { generateFreeImage } from './freeGenerationService';
import { generateToyModelImage } from './toyModelCreatorService';
import { interpolatePrompts, adaptPromptToContext } from './imageInterpolationService';
import { editImageWithPrompt } from './imageEditingService';

type PresetData = {
    viewId: string;
    state: any;
};

type GeneratorFunction = (...args: any[]) => Promise<any>;

interface PresetConfig {
    imageKeys: string[];
    generator: GeneratorFunction | ((imageUrls: (string | undefined)[], presetData: PresetData) => Promise<string[]>);
}

// --- Hardcoded Data for Random Generation ---
// NOTE: This data is duplicated from the translation files as a temporary measure
// to fix the "Random" option in presets without a major architectural refactor.
// Ideally, this data should not live in the service layer.

const AVATAR_IDEAS_BY_CATEGORY = [
    { "category": "Khoảnh Khắc Tự Hào", "ideas": [ "Tung bay tà áo dài và lá cờ đỏ", "Nụ cười rạng rỡ bên lá cờ Tổ quốc", "Chào cờ trang nghiêm ở Quảng trường Ba Đình", "Ánh mắt tự hào hướng về lá cờ", "Dạo bước trên con đường cờ hoa rực rỡ", "Tự tin check-in tại Cột cờ Lũng Cú", "Tay trong tay cùng người lính hải quân", "Vẻ đẹp kiêu hãnh trước Lăng Bác", "Giọt lệ hạnh phúc khi quốc ca vang lên", "Gửi gắm tình yêu nơi cột mốc Trường Sa", "Thiếu nữ với bó hoa sen và cờ đỏ", "Vẫy cao lá cờ chiến thắng", "Gia đình nhỏ bên lá cờ Tổ quốc", "Khoảnh khắc đời thường dưới bóng cờ", "Áo dài đỏ tung bay trên phố cổ" ] },
    { "category": "Biểu tượng & Văn hóa", "ideas": ["Áo dài đỏ sao vàng", "Bên cạnh hoa sen hồng", "Họa tiết trống đồng Đông Sơn", "Đội nón lá truyền thống", "Vẽ mặt hình cờ đỏ sao vàng", "Cầm cành đào ngày Tết", "Bên cạnh cây mai vàng", "Áo dài trắng nữ sinh", "Múa lân sư rồng", "Chơi đàn T'rưng", "Thả đèn hoa đăng", "Nghệ nhân gốm Bát Tràng", "Vẻ đẹp thiếu nữ bên khung cửi", "Cầm lồng đèn Trung Thu", "Nghệ thuật múa rối nước"] },
    { "category": "Lịch sử & Anh hùng", "ideas": ["Chiến sĩ Điện Biên Phủ", "Nữ tướng Hai Bà Trưng", "Vua Hùng dựng nước", "Thanh niên xung phong", "Chiến sĩ hải quân Trường Sa", "Anh bộ đội Cụ Hồ", "Du kích trong rừng", "Cô gái mở đường", "Tinh thần bất khuất thời Trần", "Hình tượng Thánh Gióng", "Nữ anh hùng Võ Thị Sáu", "Chân dung thời bao cấp", "Chiến sĩ giải phóng quân", "Dân công hỏa tuyến", "Người lính biên phòng"] },
    { "category": "Phong cảnh & Địa danh", "ideas": ["Giữa ruộng bậc thang Sapa", "Trên thuyền ở Vịnh Hạ Long", "Đứng trước Hồ Gươm, cầu Thê Húc", "Khám phá hang Sơn Đoòng", "Cánh đồng lúa chín vàng", "Vẻ đẹp cao nguyên đá Hà Giang", "Hoàng hôn trên phá Tam Giang", "Biển xanh Phú Quốc", "Chèo thuyền ở Tràng An, Ninh Bình", "Đi giữa phố cổ Hội An", "Cột cờ Lũng Cú", "Dinh Độc Lập lịch sử", "Nhà thờ Đức Bà Sài Gòn", "Bên dòng sông Mekong", "Vẻ đẹp Đà Lạt mộng mơ"] },
    { "category": "Ẩm thực & Đời sống", "ideas": ["Thưởng thức Phở Hà Nội", "Uống cà phê sữa đá Sài Gòn", "Gói bánh chưng ngày Tết", "Gánh hàng rong phố cổ", "Ăn bánh mì vỉa hè", "Không khí chợ nổi Cái Răng", "Làm nón lá", "Người nông dân trên đồng", "Ngư dân kéo lưới", "Gia đình sum vầy", "Bên xe máy Dream huyền thoại", "Uống trà đá vỉa hè", "Bữa cơm gia đình Việt", "Làm muối ở Hòn Khói", "Trồng cây cà phê Tây Nguyên"] },
    { "category": "Nghệ thuật & Sáng tạo", "ideas": ["Phong cách tranh cổ động", "Phong cách tranh sơn mài", "Họa tiết gốm Chu Đậu", "Nét vẽ tranh Đông Hồ", "Ánh sáng từ đèn lồng Hội An", "Nghệ thuật thư pháp", "Họa tiết thổ cẩm Tây Bắc", "Phong cách ảnh phim xưa", "Nghệ thuật điêu khắc Chăm Pa", "Vẻ đẹp tranh lụa", "Phong cách Cyberpunk Sài Gòn", "Hòa mình vào dải ngân hà", "Họa tiết rồng thời Lý", "Ánh sáng neon hiện đại", "Phong cách Low-poly"] },
    { "category": "Thể thao & Tự hào", "ideas": ["Cổ động viên bóng đá cuồng nhiệt", "Khoảnh khắc nâng cúp vàng", "Vận động viên SEA Games", "Tay đua xe đạp", "Võ sĩ Vovinam", "Cầu thủ bóng đá chuyên nghiệp", "Niềm vui chiến thắng", "Đi bão sau trận thắng", "Vận động viên điền kinh", "Tinh thần thể thao Olympic", "Tay vợt cầu lông", "Nữ vận động viên wushu", "Cờ đỏ trên khán đài", "Vận động viên bơi lội", "Huy chương vàng tự hào"] },
    { "category": "Tương lai & Khoa học", "ideas": ["Phi hành gia cắm cờ Việt Nam", "Nhà khoa học trong phòng thí nghiệm", "Kỹ sư công nghệ tương lai", "Thành phố thông minh", "Nông nghiệp công nghệ cao", "Bác sĩ robot y tế", "Năng lượng mặt trời Việt Nam", "Khám phá đại dương", "Chuyên gia trí tuệ nhân tạo", "Kiến trúc sư công trình xanh"] }
];

const BABY_PHOTO_IDEAS_BY_CATEGORY = [
    { "category": "Sơ sinh (0-1 tuổi)", "key": "newborn", "ideas": [ "Thiên thần nhỏ đang ngủ trên mây", "Bé trong giỏ hoa", "Đầu bếp nhí", "Phi hành gia tí hon", "Chú ong nhỏ", "Thủy thủ nhí", "Nàng tiên cá bé bỏng", "Bé trong quả bí ngô", "Hoàng tử bé bỏng", "Công chúa bé bỏng", "Bé trong khu rừng cổ tích", "Bé làm nông dân", "Bé trong quả dưa hấu", "Thợ lặn nhí", "Chú thỏ con đáng yêu", "Gấu con ngủ đông", "Bé trong tách trà", "Nhà thám hiểm tí hon", "Siêu anh hùng nhí", "Nhạc công nhí", "Họa sĩ nhí", "Bé trong trang phục Tết", "Bé và những quả bóng bay", "Bé trong thư viện sách", "Vận động viên nhí", "Bé ôm gấu bông khổng lồ", "Bé trong quả trứng rồng", "Nhà soạn nhạc tí hon", "Bé cuộn trong lá sen", "Thợ làm bánh mì nhí", "Bé ngủ trên mặt trăng lưỡi liềm", "Chú lính chì dũng cảm", "Bé trong một bong bóng xà phòng khổng lồ", "DJ nhí với tai nghe", "Bé làm gốm Bát Tràng", "Chú sâu bướm nhỏ", "Bé trong một vỏ sò ngọc trai", "Vận động viên cử tạ nhí", "Bé ngủ trong một bông bồ công anh", "Nhà giả kim tí hon", "Bé trong trang phục áo dài Tết", "Chú nhím con xù lông", "Bé ngồi trên một cây nấm khổng lồ", "Thuyền trưởng tí hon trên con tàu giấy", "Bé trong một quả dâu tây", "Họa sĩ nhí với bảng màu", "Bé làm vườn ươm cây", "Chú chim cánh cụt bé bỏng", "Bé ngủ trong một đóa hướng dương", "Nhà leo núi tí hon", "Bé trong bộ đồ phi công cổ điển" ] },
    { "category": "1-3 tuổi", "key": "toddler", "ideas": [ "Dạo chơi trong công viên khủng long", "Thám hiểm rừng xanh", "Cưỡi ngựa gỗ", "Tiệc trà với thú nhồi bông", "Lái xe ô tô đồ chơi", "Chơi đùa trên bãi biển", "Xây lâu đài cát", "Bé tập làm vườn", "Vui chơi ở nông trại", "Hóa thân thành sư tử", "Lạc vào xứ sở thần tiên", "Bé làm lính cứu hỏa", "Phi công nhí", "Bé đi cắm trại", "Vui đùa với bong bóng xà phòng", "Chơi trốn tìm", "Bé tập vẽ", "Bé và đoàn tàu đồ chơi", "Phiêu lưu trên con tàu cướp biển", "Bé làm bác sĩ", "Vui chơi trong nhà bóng", "Bé đi câu cá", "Nhà khoa học nhí", "Bé và những người bạn động vật", "Mùa hè ở hồ bơi", "Chơi trốn tìm trong rừng tre", "Thợ săn kho báu trên đảo hoang", "Lái một chiếc xích lô mini", "Biểu diễn xiếc trên dây", "Làm bạn với một chú robot", "Chèo thuyền thúng ở Hội An", "Nhà thám hiểm Bắc Cực", "Chăm sóc một vườn khủng long", "Điều khiển một dàn nhạc giao hưởng", "Hóa thân thành con chuồn chuồn", "Lạc vào thế giới kẹo ngọt", "Bé làm lính ngự lâm", "Tay đua xe đạp địa hình", "Bé đi dã ngoại trên khinh khí cầu", "Vui đùa với những chú đom đóm", "Hóa thân thành con tắc kè hoa", "Bé và chiếc diều sáo", "Khám phá một con tàu vũ trụ bị bỏ hoang", "Bé làm vua bếp", "Vui chơi trong một ngôi nhà trên cây", "Bé đi săn nấm trong rừng", "Nhà khí tượng học nhí", "Bé và những người bạn đom đóm", "Mùa thu nhặt lá vàng", "Xây dựng một thành phố bằng Lego" ] },
    { "category": "3-5 tuổi", "key": "preschool", "ideas": [ "Hiệp sĩ dũng cảm và lâu đài", "Công chúa trong vườn hoa hồng", "Du hành vũ trụ", "Nhà khảo cổ học khám phá di tích", "Siêu anh hùng giải cứu thành phố", "Vũ công ballet", "Ngôi sao nhạc rock", "Đầu bếp làm pizza", "Vận động viên Olympic", "Nhà ảo thuật tài ba", "Đọc sách trong thư viện ma thuật", "Chăm sóc thú cưng", "Lớp học vui nhộn", "Bé làm cảnh sát", "Hóa thân thành nhân vật cổ tích", "Chơi các nhạc cụ dân tộc", "Học làm gốm", "Bé đi siêu thị", "Lễ hội hóa trang", "Tay đua F1 nhí", "Bé làm nhà tạo mẫu tóc", "Nhà phát minh nhí", "Học võ", "Chơi thả diều", "Khám phá thế giới dưới nước", "Hiệp sĩ và con rồng thân thiện", "Công chúa chiến binh", "Du hành vào trung tâm Trái Đất", "Nhà hải dương học khám phá san hô", "Siêu anh hùng với sức mạnh thiên nhiên", "Vũ công múa lân", "Ngôi sao nhạc pop K-Pop", "Đầu bếp làm sushi", "Vận động viên trượt băng nghệ thuật", "Nhà giả kim thuật với những lọ thuốc màu", "Đọc sách trên lưng một con rùa khổng lồ", "Chăm sóc một trung tâm cứu hộ động vật", "Lớp học làm robot", "Bé làm cảnh sát giao thông", "Hóa thân thành Thạch Sanh", "Chơi đàn tranh", "Họa sĩ vẽ tranh tường", "Bé đi tàu ngầm", "Lễ hội Halloween", "Tay đua thuyền kayak", "Bé làm nhà thiết kế game", "Nhà côn trùng học nhí", "Học làm thư pháp", "Chơi nhảy sạp", "Khám phá một khu vườn bí mật" ] },
    { "category": "5-10 tuổi", "key": "child", "ideas": [ "Thám tử lừng danh", "Nhà khoa học điên rồ", "Điệp viên 007 nhí", "Nhà thám hiểm Ai Cập cổ đại", "Lập trình viên nhí", "Nhà làm phim Hollywood", "Ca sĩ trên sân khấu lớn", "Vận động viên trượt ván", "Cầu thủ bóng đá chuyên nghiệp", "Họa sĩ đường phố (graffiti)", "Nhà thiết kế thời trang", "Du hành xuyên thời gian", "Chơi cờ vua với người máy", "Nhà vô địch game e-sport", "Lớp học phép thuật Harry Potter", "Học làm bánh", "Nhà báo nhí", "Kỹ sư robot", "Chăm sóc vườn thú", "Leo núi", "Bé làm DJ", "Tham gia ban nhạc rock", "Vận động viên bóng rổ", "Nhà văn nhí", "Giáo viên tí hon", "Thám tử không gian", "Nhà thực vật học trong rừng Amazon", "Điệp viên công nghệ cao", "Nhà khảo cổ học tìm kiếm thành phố Atlantis", "CEO của một công ty khởi nghiệp", "Nhà làm phim tài liệu về động vật hoang dã", "Nhà soạn nhạc cho phim", "Vận động viên parkour", "Cầu thủ bóng rổ đường phố", "Họa sĩ vẽ truyện tranh manga", "Nhà thiết kế ô tô tương lai", "Người canh giữ ngọn hải đăng", "Chơi trong một ban nhạc jazz", "Nhà vô địch cờ vây", "Học viên tại học viện Ninja", "Đầu bếp sao Michelin", "Người dẫn chương trình TV", "Kỹ sư xây dựng cầu", "Chăm sóc một khu bảo tồn biển", "Vận động viên leo núi trong nhà", "Bé làm đạo diễn sân khấu", "Tham gia một ban nhạc indie", "Vận động viên đấu kiếm", "Nhà văn viết tiểu thuyết giả tưởng", "Người huấn luyện rồng" ] }
];


// This config map is the single source of truth for preset generation logic.
// To add a new preset-compatible app, add its configuration here.
const presetConfig: Record<string, PresetConfig> = {
    'architecture-ideator': {
        imageKeys: ['uploadedImage'],
        generator: (images, preset) => generateArchitecturalImage(images[0]!, preset.state.options),
    },
    'avatar-creator': {
        imageKeys: ['uploadedImage'],
        generator: async (images, preset) => {
            const ideas = preset.state.selectedIdeas;
            if (!ideas || ideas.length === 0) throw new Error("Preset has no ideas selected.");
            const imageUrl = images[0]!;

            const randomConceptString = "Ngẫu nhiên";
            let finalIdeas = [...ideas];

            if (finalIdeas.includes(randomConceptString)) {
                console.log("Preset contains 'Random' for Avatar Creator, resolving...");
                const randomCount = finalIdeas.filter(i => i === randomConceptString).length;

                const suggestedCategories = await analyzeAvatarForConcepts(imageUrl, AVATAR_IDEAS_BY_CATEGORY as any);
                
                let ideaPool: string[] = [];
                if (suggestedCategories.length > 0) {
                    ideaPool = AVATAR_IDEAS_BY_CATEGORY
                        .filter(c => suggestedCategories.includes(c.category))
                        .flatMap(c => c.ideas);
                }
                
                if (ideaPool.length === 0) {
                    ideaPool = AVATAR_IDEAS_BY_CATEGORY.flatMap(c => c.ideas);
                }
                
                const randomIdeas: string[] = [];
                for (let i = 0; i < randomCount; i++) {
                    if (ideaPool.length > 0) {
                         const randomIndex = Math.floor(Math.random() * ideaPool.length);
                         randomIdeas.push(ideaPool[randomIndex]);
                         ideaPool.splice(randomIndex, 1);
                    }
                }
                finalIdeas = finalIdeas.filter(i => i !== randomConceptString).concat(randomIdeas);
                finalIdeas = [...new Set(finalIdeas)];
                console.log("Resolved 'Random' to concrete ideas:", finalIdeas);
            }
            
            const promises = finalIdeas.map((idea: string) => 
                generatePatrioticImage(imageUrl, idea, preset.state.options.additionalPrompt, preset.state.options.removeWatermark, preset.state.options.aspectRatio)
            );
            return Promise.all(promises);
        },
    },
    'baby-photo-creator': {
        imageKeys: ['uploadedImage'],
        generator: async (images, preset) => {
            const ideas = preset.state.selectedIdeas;
            if (!ideas || ideas.length === 0) throw new Error("Preset has no ideas selected.");
            const imageUrl = images[0]!;

            const randomConceptString = "Ngẫu nhiên";
            let finalIdeas = [...ideas];

            if (finalIdeas.includes(randomConceptString)) {
                console.log("Preset contains 'Random' for Baby Photo Creator, resolving...");
                const randomCount = finalIdeas.filter(i => i === randomConceptString).length;
                
                const ageGroup = await estimateAgeGroup(imageUrl);
                const ageGroupConfig = BABY_PHOTO_IDEAS_BY_CATEGORY.find(c => c.key === ageGroup);
                const allIdeas = [].concat(...BABY_PHOTO_IDEAS_BY_CATEGORY.map(c => c.ideas));
                let ideaPool = ageGroupConfig ? [...ageGroupConfig.ideas] : [...allIdeas];
                
                const randomIdeas: string[] = [];
                for (let i = 0; i < randomCount; i++) {
                    if (ideaPool.length > 0) {
                         const randomIndex = Math.floor(Math.random() * ideaPool.length);
                         randomIdeas.push(ideaPool[randomIndex]);
                         ideaPool.splice(randomIndex, 1);
                    }
                }
                finalIdeas = finalIdeas.filter(i => i !== randomConceptString).concat(randomIdeas);
                finalIdeas = [...new Set(finalIdeas)];
                 console.log(`Resolved 'Random' for age group '${ageGroup}' to concrete ideas:`, finalIdeas);
            }

            const promises = finalIdeas.map((idea: string) => 
                generateBabyPhoto(imageUrl, idea, preset.state.options.additionalPrompt, preset.state.options.removeWatermark, preset.state.options.aspectRatio)
            );
            return Promise.all(promises);
        },
    },
    'dress-the-model': {
        imageKeys: ['modelImage', 'clothingImage'],
        generator: (images, preset) => generateDressedModelImage(images[0]!, images[1]!, preset.state.options),
    },
    'photo-restoration': {
        imageKeys: ['uploadedImage'],
        generator: (images, preset) => restoreOldPhoto(images[0]!, preset.state.options),
    },
    'image-to-real': {
        imageKeys: ['uploadedImage'],
        generator: (images, preset) => convertImageToRealistic(images[0]!, preset.state.options),
    },
    'swap-style': {
        imageKeys: ['uploadedImage'],
        generator: (images, preset) => swapImageStyle(images[0]!, preset.state.options),
    },
    'mix-style': {
        imageKeys: ['contentImage', 'styleImage'],
        generator: async (images, preset) => {
            const { resultUrl } = await mixImageStyle(images[0]!, images[1]!, preset.state.options);
            return [resultUrl];
        },
    },
    'toy-model-creator': {
        imageKeys: ['uploadedImage'],
        generator: (images, preset) => {
            const concept = preset.state.concept;
            if (!concept) throw new Error("Toy Model Creator preset is missing a 'concept'.");
            return generateToyModelImage(images[0]!, concept, preset.state.options);
        },
    },
    'free-generation': {
        imageKeys: ['image1', 'image2'],
        generator: (images, preset) => generateFreeImage(preset.state.options.prompt, preset.state.options.numberOfImages, preset.state.options.aspectRatio, images[0], images[1], preset.state.options.removeWatermark),
    },
    'image-interpolation': {
        imageKeys: ['referenceImage'],
        generator: async (images, preset) => {
            const { generatedPrompt, additionalNotes } = preset.state;
            const referenceUrl = images[0];
            if (!generatedPrompt || !referenceUrl) throw new Error("Preset is missing prompt or reference image.");
            let iPrompt = generatedPrompt;
            if (additionalNotes) { iPrompt = await interpolatePrompts(iPrompt, additionalNotes); }
            const fPrompt = await adaptPromptToContext(referenceUrl, iPrompt);
            const result = await editImageWithPrompt(referenceUrl, fPrompt, preset.state.options.aspectRatio, preset.state.options.removeWatermark);
            return [result];
        }
    }
};

/**
 * Centralized function to generate images from a preset file and selected canvas layers.
 * @param presetData The parsed JSON data from the preset file.
 * @param selectedLayerUrls The data URLs of the layers selected on the canvas.
 * @returns A promise that resolves to an array of generated image data URLs.
 */
export async function generateFromPreset(presetData: PresetData, selectedLayerUrls: string[]): Promise<string[]> {
    const { viewId, state } = presetData;
    const config = presetConfig[viewId];

    if (!config) {
        throw new Error(`Preset for app "${viewId}" is not supported.`);
    }

    // Map selected canvas layers to the required image inputs for the app.
    // If not enough layers are selected, use the images stored in the preset as fallbacks.
    const finalImageUrls = config.imageKeys.map((key, index) => {
        return selectedLayerUrls[index] ?? state[key];
    });

    // Ensure all required images are present
    if (finalImageUrls.some(url => !url)) {
        throw new Error(`Not enough images provided for "${viewId}" preset. Required: ${config.imageKeys.join(', ')}.`);
    }

    const result = await config.generator(finalImageUrls, presetData);

    // Ensure the result is always an array
    return Array.isArray(result) ? result : [result];
}