import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { MailService } from './mail.service.js';

const order = {
  number: 'RS-261105-K3QZ7W',
  createdAt: '2026-11-05T10:00:00.000Z',
  items: [{ slug: 'tens', name: 'TENS', qty: 1, unitPrice: 70 }],
  subtotal: 70,
  totalToConfirm: false,
  paymentMethod: 'cod' as const,
  customer: { name: 'Rana', phone: '81 164 065', governorate: 'Bekaa' as const, city: 'Shtoura', address: 'Bldg 4' },
};

const config = (values: Record<string, string>) => new ConfigService(values);

describe('MailService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('skips quietly when SMTP is not configured', async () => {
    const mail = new MailService(config({}));
    await expect(mail.notifyOrder(order)).resolves.toBe(false);
  });

  it('sends the order message to the store', async () => {
    const sendMail = vi.fn().mockResolvedValue({});
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail } as never);
    const mail = new MailService(config({ SMTP_HOST: 'smtp.test', ORDER_ALERT_TO: 'shop@test' }));

    await expect(mail.notifyOrder(order)).resolves.toBe(true);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'shop@test',
        subject: 'New order RS-261105-K3QZ7W',
        text: expect.stringContaining('Payment: Cash on delivery'),
      }),
    );
  });

  it('never throws when sending fails', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('SMTP down'));
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail } as never);
    const mail = new MailService(config({ SMTP_HOST: 'smtp.test', ORDER_ALERT_TO: 'shop@test' }));

    await expect(mail.notifyOrder(order)).resolves.toBe(false);
  });
});
