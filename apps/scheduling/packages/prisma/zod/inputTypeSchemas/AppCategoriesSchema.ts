import { z } from 'zod';

export const AppCategoriesSchema = z.enum(['calendar','messaging','other','payment','video','web3','automation','analytics','conferencing','crm']);

export type AppCategoriesType = `${z.infer<typeof AppCategoriesSchema>}`

export default AppCategoriesSchema;
