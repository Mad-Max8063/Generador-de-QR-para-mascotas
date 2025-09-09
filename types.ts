
export interface PetInfo {
    petName: string;
    petType: string;
    petBreed: string;
    features: string[];
    ownerName: string;
    phone: string;
    email: string;
    medicalInfo: string;
    otherInfo: string;
}

export enum Shape {
    Circle = 'circle',
    Bone = 'bone',
    Heart = 'heart',
    Square = 'square',
}

export interface DesignConfig {
    shape: Shape;
    thickness: number;
    size: number;
}
