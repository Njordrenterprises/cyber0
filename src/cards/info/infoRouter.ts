import { BaseCardRouter } from "../cardRouter.ts";

export class InfoCardRouter extends BaseCardRouter {
  constructor(userId: string) {
    super('info', userId);
  }

  // Add any info-card specific route handlers here
  // For example:
  // async handleCustomInfoAction(req: Request): Promise<Response> {
  //   // Custom logic for info cards
  // }
} 