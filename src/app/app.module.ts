import { Module } from '@nestjs/common';

import { EvidenceModule } from '../evidence/evidence.module.js';

@Module({
  imports: [EvidenceModule],
})
export class AppModule {}
