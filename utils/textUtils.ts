/**
 * Türkçe karakterleri normalize eder ve küçük harfe çevirir
 * Örnek: "Ağır" -> "agir", "Çiçek" -> "cicek"
 */
export const normalizeTurkish = (text: string): string => {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
};

/**
 * İki metni Türkçe karakterleri normalize ederek karşılaştırır
 * "İçinde geçen" (LIKE %query%) mantığıyla çalışır
 * 
 * Örnek: 
 * - searchQuery: "agi" 
 * - Bulur: "Ağır Roman", "Yağmur", "Bağırsak", "Sağır"
 * 
 * @param text - Aranacak metin (film adı, kanal adı vs.)
 * @param searchQuery - Kullanıcının yazdığı arama sorgusu
 * @returns true ise eşleşme var, false ise yok
 */
export const turkishIncludes = (text: string, searchQuery: string): boolean => {
  if (!text || !searchQuery) return false;
  
  const normalizedText = normalizeTurkish(text);
  const normalizedQuery = normalizeTurkish(searchQuery);
  
  // %query% mantığı: normalize edilmiş metinde, normalize edilmiş sorgu geçiyor mu?
  return normalizedText.includes(normalizedQuery);
};

