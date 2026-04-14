from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
import qrcode


def generate_invoice_pdf(invoice):
    """Generate professional PDF invoice with QR code"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1a73e8'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    elements.append(Paragraph("ColdSync Pro", title_style))
    elements.append(Paragraph("Cold Drink Agency", styles['Normal']))
    elements.append(Spacer(1, 0.3*inch))
    
    # Invoice Header
    invoice_title = ParagraphStyle('InvoiceTitle', parent=styles['Heading2'], fontSize=18, textColor=colors.HexColor('#333333'))
    elements.append(Paragraph(f"INVOICE: {invoice.invoice_number}", invoice_title))
    elements.append(Spacer(1, 0.2*inch))
    
    # Customer and Invoice Details
    details_data = [
        ['Bill To:', '', 'Invoice Date:', invoice.created_at.strftime('%d-%m-%Y')],
        [invoice.customer.shop_name, '', 'Payment Method:', invoice.payment_method],
        [invoice.customer.owner_name, '', 'Order ID:', f"#{invoice.order.id}"],
        [f"Phone: {invoice.customer.phone}", '', '', ''],
        [invoice.customer.address, '', '', ''],
    ]
    
    details_table = Table(details_data, colWidths=[3*inch, 1*inch, 1.5*inch, 2*inch])
    details_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1a73e8')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(details_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Order Items Table
    items_data = [['#', 'Product', 'Quantity', 'Rate', 'Amount']]
    
    for idx, item in enumerate(invoice.order.items.all(), 1):
        total_bottles = item.get_total_bottles()
        items_data.append([
            str(idx),
            item.product.product_name,
            f"{item.quantity_crates} crates + {item.quantity_bottles} bottles ({total_bottles} total)",
            f"₹{item.price}",
            f"₹{item.get_item_total()}"
        ])
    
    items_table = Table(items_data, colWidths=[0.5*inch, 3*inch, 2*inch, 1*inch, 1.5*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a73e8')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Totals
    totals_data = [
        ['', '', 'Subtotal:', f"₹{invoice.subtotal}"],
        ['', '', f'GST ({invoice.gst_percentage}%):', f"₹{invoice.gst_amount}"],
        ['', '', 'Total Amount:', f"₹{invoice.total_amount}"],
    ]
    
    totals_table = Table(totals_data, colWidths=[3*inch, 2*inch, 1.5*inch, 1.5*inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, -1), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (2, -1), (-1, -1), 12),
        ('TEXTCOLOR', (2, -1), (-1, -1), colors.HexColor('#1a73e8')),
        ('LINEABOVE', (2, -1), (-1, -1), 2, colors.HexColor('#1a73e8')),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 0.4*inch))
    
    # QR Code for UPI Payment
    if invoice.payment_method == 'UPI':
        upi_string = f"upi://pay?pa=coldsync@upi&pn=ColdSync Pro&am={invoice.total_amount}&cu=INR&tn=Invoice {invoice.invoice_number}"
        qr = qrcode.QRCode(version=1, box_size=10, border=2)
        qr.add_data(upi_string)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        qr_buffer = BytesIO()
        qr_img.save(qr_buffer, format='PNG')
        qr_buffer.seek(0)
        
        qr_image = Image(qr_buffer, width=1.5*inch, height=1.5*inch)
        elements.append(Paragraph("Scan to Pay via UPI", styles['Normal']))
        elements.append(qr_image)
    
    # Footer
    elements.append(Spacer(1, 0.5*inch))
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], fontSize=9, textColor=colors.grey, alignment=TA_CENTER)
    elements.append(Paragraph("Thank you for your business!", footer_style))
    elements.append(Paragraph("ColdSync Pro - Your Trusted Cold Drink Partner", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer
