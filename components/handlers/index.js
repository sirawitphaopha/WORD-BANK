import { reviewActions } from './review';
import { categoryActions } from './category';
import { processActions } from './process';
import { uiActions } from './ui';
import { renderActions } from './render';

// ติดตั้ง handler ทุกกลุ่มลงบน instance (app.X = ...) — เรียกใน constructor ก่อน render/lifecycle
export function installHandlers(app) {
  reviewActions(app); categoryActions(app); processActions(app); uiActions(app); renderActions(app);
}
