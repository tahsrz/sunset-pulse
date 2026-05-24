import { z } from 'zod';

export const VideoCallGuestScalarFieldEnumSchema = z.enum(['id','bookingUid','email','name','joinedAt','createdAt','updatedAt']);

export default VideoCallGuestScalarFieldEnumSchema;
