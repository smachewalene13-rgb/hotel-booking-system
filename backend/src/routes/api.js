import express from 'express';
import { authenticate, optionalAuth, authorize } from '../middleware/auth.js';

// Controllers
import * as authCtrl from '../controllers/authController.js';
import * as roomCtrl from '../controllers/roomController.js';
import * as bookingCtrl from '../controllers/bookingController.js';
import * as paymentCtrl from '../controllers/paymentController.js';
import * as staffCtrl from '../controllers/staffController.js';
import * as houseCtrl from '../controllers/housekeepingController.js';
import * as promoCtrl from '../controllers/promoController.js';
import * as reviewCtrl from '../controllers/reviewController.js';
import * as reportCtrl from '../controllers/reportController.js';
import * as adminCtrl from '../controllers/adminController.js';
import { generateBookingInvoicePDF } from '../services/invoiceService.js';

const router = express.Router();

// ----------------------------------------------------
// 1. Auth & Account Management (FR-AUTH)
// ----------------------------------------------------
router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);
router.post('/auth/refresh', authCtrl.refreshToken);
router.post('/auth/forgot-password', authCtrl.forgotPassword);
router.post('/auth/reset-password', authCtrl.resetPassword);

// User Profile
router.get('/users/me', authenticate, authCtrl.getProfile);
router.put('/users/me', authenticate, authCtrl.updateProfile);
router.put('/users/me/password', authenticate, authCtrl.changePassword);

// ----------------------------------------------------
// 2. Public Rooms, Availability & Amenities (FR-ROOM, FR-SRCH)
// ----------------------------------------------------
router.get('/hotel-settings', roomCtrl.getHotelSettings);
router.get('/room-types', roomCtrl.getRoomTypes);
router.get('/room-types/:id', roomCtrl.getRoomTypeById);
router.get('/room-types/:id/calendar', roomCtrl.getRoomCalendar);
router.get('/availability', roomCtrl.getAvailability);
router.get('/services', roomCtrl.getServices);
router.get('/amenities', roomCtrl.getAmenities);

// ----------------------------------------------------
// 3. Guest Bookings (FR-BOOK)
// ----------------------------------------------------
router.post('/bookings', optionalAuth, bookingCtrl.createBooking);
router.get('/bookings/me', authenticate, bookingCtrl.getMyBookings);
router.get('/bookings/:id', optionalAuth, bookingCtrl.getBookingById);
router.post('/bookings/:id/cancel', optionalAuth, bookingCtrl.cancelBooking);
router.post('/bookings/:id/extras', optionalAuth, bookingCtrl.addExtraService);
router.post('/bookings/lookup', bookingCtrl.lookupBookingWithoutAccount);

// PDF Invoice (FR-PAY-07)
router.get('/bookings/:id/invoice.pdf', optionalAuth, async (req, res, next) => {
  try {
    await generateBookingInvoicePDF(req.params.id, res);
  } catch (err) {
    next(err);
  }
});

// ----------------------------------------------------
// 4. Payments & Webhooks (FR-PAY)
// ----------------------------------------------------
router.post('/payments/initiate', optionalAuth, paymentCtrl.initiatePayment);
router.post('/payments/webhook', paymentCtrl.handleWebhook);
router.post('/payments/simulate-success', optionalAuth, paymentCtrl.simulatePaymentSuccess);
router.post('/staff/payments', authenticate, authorize(['receptionist', 'manager', 'admin']), paymentCtrl.recordDeskPayment);
router.get('/refunds', authenticate, authorize(['manager', 'admin']), paymentCtrl.getRefundsList);
router.put('/refunds/:id/approve', authenticate, authorize(['manager', 'admin']), paymentCtrl.approveRefund);

// ----------------------------------------------------
// 5. Promotions (FR-PRICE-04)
// ----------------------------------------------------
router.post('/promotions/validate', promoCtrl.validatePromoCode);
router.get('/admin/promotions', authenticate, authorize(['manager', 'admin']), promoCtrl.getPromotions);
router.post('/admin/promotions', authenticate, authorize(['manager', 'admin']), promoCtrl.createPromotion);
router.put('/admin/promotions/:id', authenticate, authorize(['manager', 'admin']), promoCtrl.updatePromotion);
router.delete('/admin/promotions/:id', authenticate, authorize(['manager', 'admin']), promoCtrl.deletePromotion);

// ----------------------------------------------------
// 6. Reviews (FR-REV)
// ----------------------------------------------------
router.get('/room-types/:id/reviews', reviewCtrl.getRoomTypeReviews);
router.post('/reviews', authenticate, reviewCtrl.submitReview);
router.get('/admin/reviews', authenticate, authorize(['manager', 'admin']), reviewCtrl.getAllReviewsForAdmin);
router.put('/admin/reviews/:id', authenticate, authorize(['manager', 'admin']), reviewCtrl.moderateReview);

// ----------------------------------------------------
// 7. Staff Front Desk Operations (FR-FD)
// ----------------------------------------------------
router.get('/staff/dashboard', authenticate, authorize(['receptionist', 'manager', 'admin']), staffCtrl.getFrontDeskDashboard);
router.get('/staff/bookings', authenticate, authorize(['receptionist', 'manager', 'admin']), staffCtrl.getAllStaffBookings);
router.post('/staff/bookings', authenticate, authorize(['receptionist', 'manager', 'admin']), staffCtrl.createWalkInBooking);
router.post('/staff/bookings/:id/check-in', authenticate, authorize(['receptionist', 'manager', 'admin']), staffCtrl.checkInGuest);
router.post('/staff/bookings/:id/check-out', authenticate, authorize(['receptionist', 'manager', 'admin']), staffCtrl.checkOutGuest);
router.post('/staff/bookings/:id/extras', authenticate, authorize(['receptionist', 'manager', 'admin']), staffCtrl.postFolioCharge);
router.post('/staff/bookings/:id/move-room', authenticate, authorize(['receptionist', 'manager', 'admin']), staffCtrl.moveRoom);

// ----------------------------------------------------
// 8. Housekeeping Operations (FR-FD-08)
// ----------------------------------------------------
router.get('/housekeeping/rooms', authenticate, authorize(['housekeeping', 'receptionist', 'manager', 'admin']), houseCtrl.getHousekeepingBoard);
router.put('/housekeeping/rooms/:id/status', authenticate, authorize(['housekeeping', 'receptionist', 'manager', 'admin']), houseCtrl.updateHousekeepingStatus);

// ----------------------------------------------------
// 9. Management & Room Admin (FR-ROOM)
// ----------------------------------------------------
router.get('/admin/rooms', authenticate, authorize(['receptionist', 'housekeeping', 'manager', 'admin']), roomCtrl.getAllRooms);
router.post('/admin/room-types', authenticate, authorize(['manager', 'admin']), roomCtrl.createRoomType);
router.put('/admin/room-types/:id', authenticate, authorize(['manager', 'admin']), roomCtrl.updateRoomType);
router.delete('/admin/room-types/:id', authenticate, authorize(['manager', 'admin']), roomCtrl.deactivateOrDeleteRoomType);

router.post('/admin/rooms', authenticate, authorize(['manager', 'admin']), roomCtrl.createRoom);
router.put('/admin/rooms/:id', authenticate, authorize(['manager', 'admin']), roomCtrl.updateRoom);

router.get('/admin/rate-rules', authenticate, authorize(['manager', 'admin']), roomCtrl.getRateRules);
router.post('/admin/rate-rules', authenticate, authorize(['manager', 'admin']), roomCtrl.createRateRule);
router.delete('/admin/rate-rules/:id', authenticate, authorize(['manager', 'admin']), roomCtrl.deleteRateRule);

router.get('/admin/room-blocks', authenticate, authorize(['receptionist', 'manager', 'admin']), roomCtrl.getRoomBlocks);
router.post('/admin/room-blocks', authenticate, authorize(['receptionist', 'manager', 'admin']), roomCtrl.createRoomBlock);
router.delete('/admin/room-blocks/:id', authenticate, authorize(['manager', 'admin']), roomCtrl.deleteRoomBlock);

// ----------------------------------------------------
// 10. Reports & Analytics (FR-ADM-02, FR-ADM-03)
// ----------------------------------------------------
router.get('/reports/occupancy', authenticate, authorize(['manager', 'admin']), reportCtrl.getOccupancyReport);
router.get('/reports/revenue', authenticate, authorize(['manager', 'admin']), reportCtrl.getRevenueReport);
router.get('/reports/top-room-types', authenticate, authorize(['manager', 'admin']), reportCtrl.getTopRoomTypes);
router.get('/reports/export', authenticate, authorize(['manager', 'admin']), reportCtrl.exportReportCsv);

// ----------------------------------------------------
// 11. System Administration & Audit (FR-ADM-01, 04, 05)
// ----------------------------------------------------
router.get('/admin/users', authenticate, authorize(['admin']), adminCtrl.getUsers);
router.post('/admin/users', authenticate, authorize(['admin']), adminCtrl.createUser);
router.put('/admin/users/:id', authenticate, authorize(['admin']), adminCtrl.updateUser);
router.delete('/admin/users/:id', authenticate, authorize(['admin']), adminCtrl.deactivateUser);

router.get('/admin/audit-logs', authenticate, authorize(['admin', 'manager']), adminCtrl.getAuditLogs);
router.put('/admin/settings', authenticate, authorize(['admin']), adminCtrl.updateHotelSettings);

export default router;
