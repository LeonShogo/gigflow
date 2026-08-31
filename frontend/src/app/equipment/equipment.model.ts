export type RequirementState = 'UNKNOWN' | 'YES' | 'NO';

export interface Equipment {
  id: number;
  name: string;
  category?: string;
}

export interface EquipmentRequest {
  name: string;
  category?: string;
}

export interface EquipmentRequirement {
  id: number;
  eventId: number;
  equipmentId: number;
  equipmentName: string;
  category?: string;
  availableOnSite: RequirementState;
  needsToBeBrought: RequirementState;
  responsibleMusicianId?: number | null;
  responsibleMusician?: MusicianRef;
}

export interface EquipmentRequirementRequest {
  eventId: number;
  equipmentId: number;
  availableOnSite?: RequirementState;
  needsToBeBrought?: RequirementState;
  responsibleMusicianId?: number | null;
}

export interface MusicianRef {
  id: number;
  firstName: string;
  lastName: string;
  instrument?: string;
}
