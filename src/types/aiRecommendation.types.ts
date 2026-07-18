
export interface AiRecommendationRequest {

    budget: number;

    audiences: string[];

    crackerTypes: string[];

    noiseLevels: string[];

    timePreferences: string[];

    features: string[];

}


export interface AiProduct {

    productId: string;

    categoryId: string;

    price: number;

    quantity: number;

    aiTags: string[];

}


export interface RecommendationCandidate {

    productId: string;

    categoryId: string;

    price: number;

    quantity: number;

    score: number;

    aiTags: string[];

    matchedAudience: boolean;

    matchedType: boolean;

    matchedNoise: boolean;

    matchedTime: boolean;

}

export interface PackageItem {

    productId: string;

    selectedQty: number;

}