export type Role = 'user' | 'model';

export interface Message {
  id: number;
  role: Role;
  text: string;
  reactions?: string[];
  imageUrl?: string;
  isFavorite?: boolean;
}

export type Personality = 'Caring' | 'Playful' | 'Intellectual';