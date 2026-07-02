import { z } from 'zod';

export const WorkflowScalarFieldEnumSchema = z.enum(['id','name','userId','teamId','trigger','time','timeUnit','isActiveOnAll','type','position']);

export default WorkflowScalarFieldEnumSchema;
