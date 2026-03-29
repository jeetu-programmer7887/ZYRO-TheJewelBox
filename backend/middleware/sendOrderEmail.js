import axios from "axios";

const sendOrderEmail = async (email, order) => {
  try {
    const api_key = process.env.BREVO_API_KEY;
    const Brevo_url = "https://api.brevo.com/v3/smtp/email";

    const formattedDeliveryDate = order.deliveryDate 
        ? new Date(order.deliveryDate).toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }) 
        : "3-7 Business Days";

    let statusConfig = {
      subject: "",
      title: "",
      color: "#2E4A3E",
      message: ""
    };

    switch (order.status) {
      case "Order Placed":
        statusConfig = {
          subject: "Your ZYRO Order has been Placed!",
          title: "Thank You for Your Order",
          color: "#2E4A3E",
          message: `We've received your order and are currently preparing it with care. Your ZYRO treasure is expected to reach you by **${formattedDeliveryDate}**.`
        };
        break;
      case "Out for delivery":
        statusConfig = {
          subject: "Your ZYRO parcel is out for delivery!",
          title: "Almost There!",
          color: "#2E4A3E",
          message: "Your luxury items are with our delivery partner and will reach you shortly. Please ensure someone is available to receive your treasure."
        };
        break;
      case "Delivered":
        statusConfig = {
          subject: "Your ZYRO Treasure has Arrived!",
          title: "Order Delivered",
          color: "#2E4A3E",
          message: "Your luxury items have been delivered. We hope they add a touch of sparkle to your day."
        };
        break;
      case "Cancelled":
        statusConfig = {
          subject: "ZYRO - Order Cancellation Update",
          title: "Order Cancelled",
          color: "#991B1B",
          message: "Your order has been cancelled as per your request or due to unforeseen circumstances."
        };
        break;
      case "Returned":
        statusConfig = {
          subject: "ZYRO - Your Return has been Processed",
          title: "Order Returned",
          color: "#B45309",
          message: "Your return request has been approved and processed. Any coins earned from this order have been deducted from your account. We hope to serve you again soon."
        };
        break;
      default:
        statusConfig.subject = `Update on your ZYRO Order: ${order.status}`;
        statusConfig.title = "Order Update";
        statusConfig.message = `There has been an update regarding your order status: ${order.status}.`;
    }

    const emailData = {
      sender: { name: "ZYRO Team", email: process.env.ADMIN_EMAIL },
      to: [{ email }],
      subject: statusConfig.subject,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: 'DM Sans', Arial, sans-serif; background-color: #F9F7F5; margin: 0; padding: 10px;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
            
            <div style="background-color: #2E4A3E; padding: 30px; text-align: center;">
              <h1 style="color: #C6A664; margin: 0; font-size: 28px; letter-spacing: 4px; text-transform: uppercase; font-style: italic;">ZYRO</h1>
              <p style="color: #ffffff; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; margin-top: 10px; opacity: 0.7;">FASHION JEWELLERY</p>
            </div>

            <div style="padding: 40px; color: #2E4A3E;">
              <h2 style="margin: 0 0 20px 0; color: ${statusConfig.color}; font-size: 20px;">${statusConfig.title}</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #555;">Hi ${order.address.firstName} ${order.address.lastName},</p>
              <p style="font-size: 14px; line-height: 1.6; color: #555;">${statusConfig.message.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#2E4A3E;">$1</strong>')}</p>
              
              <div style="background-color: #F9FAF9; border-radius: 16px; padding: 25px; margin: 30px 0; border: 1px solid #E5E7EB;">
                <p style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; color: #2E4A3E;">Order ID: <span style="color: #C6A664;">${order._id}</span></p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">
                
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>Status:</strong> ${order.status}</p>
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>Expected Delivery:</strong> <span style="color: #2E4A3E; font-weight: bold;">${formattedDeliveryDate}</span></p>
                <p style="font-size: 14px; margin-bottom: 5px;"><strong>Total Amount:</strong> ₹${order.amount.toLocaleString()}</p>
                <p style="font-size: 14px;"><strong>Items:</strong> ${order.items.map(i => i.title).join(', ')}</p>
              </div>

              <p style="font-size: 12px; color: #7e8180; margin-top: 30px;">
                Need help? Don't hesitate just contact our team at <a href="mailto:zyrojewellery9395@gmail.com" style="color: #C6A664; text-decoration: none;">zyrojewellery9395@gmail.com</a>
              </p>
            </div>

            <div style="background-color: #F9FAF9; padding: 20px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 1px;">&copy; 2026 ZYRO Jewelry. All Rights Reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await axios.post(Brevo_url, emailData, {
      headers: { "Content-Type": "application/json", "api-key": api_key },
      timeout: 7000,
    });

    return true;
  } catch (error) {
    console.log("Order Email Error:", error.response?.data || error.message);
    return false;
  }
};

export default sendOrderEmail;