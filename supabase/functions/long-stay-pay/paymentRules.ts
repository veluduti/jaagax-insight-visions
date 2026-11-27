export function isVerifiedLongStayPayment(payment: {status?:string;currency?:string;order_id?:string;amount?:number}, orderId:string, amount:number) {
  return payment.status==='captured' && payment.currency==='INR' && payment.order_id===orderId && Number(payment.amount)===Math.round(amount*100);
}
