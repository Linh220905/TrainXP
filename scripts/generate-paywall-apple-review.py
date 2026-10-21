import os
import glob
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def get_font(name, size):
    matches = glob.glob(f'artifacts/train-xp/**/{name}*.ttf', recursive=True)
    if matches:
        return ImageFont.truetype(matches[0], size)
    return ImageFont.load_default()

font_regular = get_font('Inter_400Regular', 32)
font_medium = get_font('Inter_500Medium', 33)
font_semibold = get_font('Inter_600SemiBold', 35)
font_bold = get_font('Inter_700Bold', 48)
font_extrabold = get_font('Inter_800ExtraBold', 52)
font_black = get_font('Inter_900Black', 62)

font_time = get_font('Inter_700Bold', 46)
font_hero_title = get_font('Inter_900Black', 62)
font_hero_sub = get_font('Inter_500Medium', 36)
font_pill = get_font('Inter_900Black', 28)
font_btn_restore = get_font('Inter_700Bold', 32)
font_badge = get_font('Inter_900Black', 26)
font_cta = get_font('Inter_900Black', 46)

W, H = 1179, 2556
img = Image.new("RGBA", (W, H), (7, 11, 20, 255))
draw = ImageDraw.Draw(img)

# Colors
DARK_BG = (7, 11, 20, 255)
CYAN = (56, 189, 248, 255) # #38BDF8
TEXT_WHITE = (255, 255, 255, 255)
TEXT_MUTED = (148, 163, 184, 255) # #94A3B8
TEXT_DIM = (100, 116, 139, 255)
BORDER_COLOR = (30, 41, 59, 255) # #1E293B
CARD_BG = (14, 23, 38, 255) # #0E1726
CARD_ACTIVE_BG = (17, 35, 62, 255) # #11233E
ICON_BG = (19, 35, 56, 255)

# 1. Status Bar (iPhone Dynamic Island & Status)
# Time
draw.text((105, 50), "9:41", font=font_time, fill=TEXT_WHITE)

# Dynamic Island
di_w, di_h = 370, 105
di_x = (W - di_w) // 2
di_y = 35
draw.rounded_rectangle([di_x, di_y, di_x + di_w, di_y + di_h], radius=di_h // 2, fill=(0, 0, 0, 255))
# Camera lens reflection
draw.ellipse([di_x + di_w - 75, di_y + 35, di_x + di_w - 40, di_y + 70], fill=(8, 22, 35, 255), outline=(36, 77, 104, 255), width=2)
draw.ellipse([di_x + 50, di_y + 37, di_x + 80, di_y + 67], fill=(5, 12, 20, 255))

# Status icons on top right
sx = W - 230
sy = 62
# Signal bars
for i in range(4):
    bx = sx + i * 11
    bh = 10 + i * 7
    draw.rectangle([bx, sy + 30 - bh, bx + 7, sy + 30], fill=TEXT_WHITE)

# Wifi icon
wx = sx + 60
draw.arc([wx, sy + 2, wx + 36, sy + 38], 200, 340, fill=TEXT_WHITE, width=4)
draw.arc([wx + 7, sy + 9, wx + 29, sy + 31], 200, 340, fill=TEXT_WHITE, width=4)
draw.ellipse([wx + 15, sy + 23, wx + 21, sy + 29], fill=TEXT_WHITE)

# Battery icon
bx = sx + 120
draw.rounded_rectangle([bx, sy + 5, bx + 64, sy + 32], radius=7, outline=TEXT_WHITE, width=3)
draw.rounded_rectangle([bx + 4, sy + 9, bx + 48, sy + 28], radius=4, fill=TEXT_WHITE)
draw.rounded_rectangle([bx + 64, sy + 13, bx + 68, sy + 24], radius=2, fill=TEXT_WHITE)

# 2. Top Controls Bar
# Restore purchases button
rx, ry, rw, rh = 55, 185, 335, 80
draw.rounded_rectangle([rx, ry, rx + rw, ry + rh], radius=rh // 2, fill=(18, 25, 39, 255), outline=BORDER_COLOR, width=2)
draw.text((rx + 32, ry + 20), "Khôi phục gói mua", font=font_btn_restore, fill=TEXT_MUTED)

# Close button (X)
cx, cy, cd = W - 55 - 80, 185, 80
draw.rounded_rectangle([cx, cy, cx + cd, cy + cd], radius=cd // 2, fill=(18, 25, 39, 255), outline=BORDER_COLOR, width=2)
# Draw X
x_mid_x, x_mid_y = cx + cd // 2, cy + cd // 2
d_x = 15
draw.line([x_mid_x - d_x, x_mid_y - d_x, x_mid_x + d_x, x_mid_y + d_x], fill=TEXT_MUTED, width=4)
draw.line([x_mid_x - d_x, x_mid_y + d_x, x_mid_x + d_x, x_mid_y - d_x], fill=TEXT_MUTED, width=4)

# 3. Headline Section
# Pro Pill Badge: ⚡ TRAINXP PRO
pill_w, pill_h = 320, 68
pill_x = (W - pill_w) // 2
pill_y = 310
draw.rounded_rectangle([pill_x, pill_y, pill_x + pill_w, pill_y + pill_h], radius=pill_h // 2, fill=CYAN)
# Zap icon inside badge
zx = pill_x + 35
zy = pill_y + 18
draw.polygon([(zx + 10, zy), (zx, zy + 17), (zx + 11, zy + 17), (zx + 7, zy + 32), (zx + 19, zy + 13), (zx + 9, zy + 13)], fill=(7, 11, 20, 255))
draw.text((pill_x + 65, pill_y + 16), "TRAINXP PRO", font=font_pill, fill=(7, 11, 20, 255))

# Hero Title (2 lines)
line1 = "Bứt phá thể hình & sức mạnh"
line2 = "cùng TrainXP Pro"
bbox1 = draw.textbbox((0, 0), line1, font=font_hero_title)
bbox2 = draw.textbbox((0, 0), line2, font=font_hero_title)
draw.text(((W - (bbox1[2] - bbox1[0])) // 2, 410), line1, font=font_hero_title, fill=TEXT_WHITE)
draw.text(((W - (bbox2[2] - bbox2[0])) // 2, 490), line2, font=font_hero_title, fill=TEXT_WHITE)

# Hero Subtitle
sub_text = "Tập theo lộ trình, hiểu cơ thể và thấy rõ tiến bộ qua từng buổi."
bbox_sub = draw.textbbox((0, 0), sub_text, font=font_hero_sub)
draw.text(((W - (bbox_sub[2] - bbox_sub[0])) // 2, 590), sub_text, font=font_hero_sub, fill=TEXT_MUTED)

# 4. Feature Highlights Card
fbox_x, fbox_y, fbox_w, fbox_h = 55, 675, W - 110, 315
draw.rounded_rectangle([fbox_x, fbox_y, fbox_x + fbox_w, fbox_y + fbox_h], radius=40, fill=(12, 19, 34, 255), outline=BORDER_COLOR, width=3)

features = [
    ("calendar", "Giáo án theo mục tiêu, có lịch và bài tập rõ ràng"),
    ("activity", "Phân tích nhóm cơ, sức mạnh và cân nặng chi tiết"),
    ("zap", "Pro: thêm 70 XP mỗi buổi, lên cấp nhanh hơn")
]

for idx, (icon_type, text) in enumerate(features):
    row_y = fbox_y + 32 + idx * 88
    # Icon circle
    ic_x, ic_y, ic_d = fbox_x + 35, row_y, 56
    draw.ellipse([ic_x, ic_y, ic_x + ic_d, ic_y + ic_d], fill=ICON_BG)
    
    # Draw vector icon inside
    cx_i, cy_i = ic_x + ic_d // 2, ic_y + ic_d // 2
    if icon_type == "calendar":
        cw, ch = 24, 22
        draw.rounded_rectangle([cx_i - cw//2, cy_i - ch//2 + 3, cx_i + cw//2, cy_i + ch//2 + 3], radius=4, outline=CYAN, width=3)
        draw.line([cx_i - cw//2, cy_i - 2, cx_i + cw//2, cy_i - 2], fill=CYAN, width=2)
        draw.line([cx_i - 6, cy_i - ch//2 - 2, cx_i - 6, cy_i - ch//2 + 4], fill=CYAN, width=3)
        draw.line([cx_i + 6, cy_i - ch//2 - 2, cx_i + 6, cy_i - ch//2 + 4], fill=CYAN, width=3)
    elif icon_type == "activity":
        # heartbeat pulse
        pts = [(cx_i - 16, cy_i), (cx_i - 8, cy_i), (cx_i - 3, cy_i - 12), (cx_i + 3, cy_i + 12), (cx_i + 8, cy_i - 4), (cx_i + 12, cy_i), (cx_i + 16, cy_i)]
        draw.line(pts, fill=CYAN, width=3, joint="curve")
    elif icon_type == "zap":
        # lightning
        pts = [(cx_i + 2, cy_i - 14), (cx_i - 8, cy_i + 2), (cx_i + 2, cy_i + 2), (cx_i - 2, cy_i + 14), (cx_i + 8, cy_i - 2), (cx_i - 2, cy_i - 2)]
        draw.polygon(pts, fill=CYAN)
        
    draw.text((fbox_x + 115, row_y + 10), text, font=font_semibold, fill=(226, 232, 240, 255))

# 5. Pricing Cards
# Card 1: Annual (Selected)
c1_x, c1_y, c1_w, c1_h = 55, 1030, W - 110, 255
# Outer neon glow for selected card
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow)
glow_draw.rounded_rectangle([c1_x - 6, c1_y - 6, c1_x + c1_w + 6, c1_y + c1_h + 6], radius=46, fill=(56, 189, 248, 80))
glow = glow.filter(ImageFilter.GaussianBlur(15))
img = Image.alpha_composite(img, glow)
draw = ImageDraw.Draw(img)

draw.rounded_rectangle([c1_x, c1_y, c1_x + c1_w, c1_y + c1_h], radius=40, fill=CARD_ACTIVE_BG, outline=CYAN, width=6)

# Badge tag "THANH TOÁN THEO NĂM"
b_w, b_h = 390, 52
b_x = c1_x + c1_w - b_w - 40
b_y = c1_y - 26
draw.rounded_rectangle([b_x, b_y, b_x + b_w, b_y + b_h], radius=b_h // 2, fill=CYAN)
draw.text((b_x + 28, b_y + 11), "THANH TOÁN THEO NĂM", font=font_badge, fill=(7, 11, 20, 255))

# Left side Card 1
rc1_x, rc1_y, rc1_r = c1_x + 60, c1_y + c1_h // 2, 26
draw.ellipse([rc1_x - rc1_r, rc1_y - rc1_r, rc1_x + rc1_r, rc1_y + rc1_r], outline=CYAN, width=5)
draw.ellipse([rc1_x - 12, rc1_y - 12, rc1_x + 12, rc1_y + 12], fill=CYAN)

draw.text((c1_x + 115, c1_y + 60), "1 Năm", font=font_bold, fill=TEXT_WHITE)
draw.text((c1_x + 115, c1_y + 138), "Thanh toán theo năm", font=font_medium, fill=TEXT_MUTED)

# Right side Card 1
price_ann = "499.000 ₫"
ann_sub = "≈ 41.583 ₫ / tháng"
bbox_pa = draw.textbbox((0, 0), price_ann, font=font_extrabold)
bbox_unit = draw.textbbox((0, 0), " / năm", font=font_semibold)
pa_w = (bbox_pa[2] - bbox_pa[0]) + (bbox_unit[2] - bbox_unit[0])
rx_ann = c1_x + c1_w - 45 - pa_w

draw.text((rx_ann, c1_y + 58), price_ann, font=font_extrabold, fill=TEXT_WHITE)
draw.text((rx_ann + (bbox_pa[2] - bbox_pa[0]), c1_y + 72), " / năm", font=font_semibold, fill=TEXT_MUTED)

bbox_asub = draw.textbbox((0, 0), ann_sub, font=font_medium)
draw.text((c1_x + c1_w - 45 - (bbox_asub[2] - bbox_asub[0]), c1_y + 138), ann_sub, font=font_medium, fill=TEXT_MUTED)


# Card 2: Monthly (99k)
c2_x, c2_y, c2_w, c2_h = 55, 1320, W - 110, 235
draw.rounded_rectangle([c2_x, c2_y, c2_x + c2_w, c2_y + c2_h], radius=40, fill=CARD_BG, outline=BORDER_COLOR, width=3)

rc2_x, rc2_y, rc2_r = c2_x + 60, c2_y + c2_h // 2, 26
draw.ellipse([rc2_x - rc2_r, rc2_y - rc2_r, rc2_x + rc2_r, rc2_y + rc2_r], outline=(71, 85, 105, 255), width=4)

draw.text((c2_x + 115, c2_y + 55), "1 Tháng", font=font_bold, fill=TEXT_WHITE)
draw.text((c2_x + 115, c2_y + 130), "Thanh toán linh hoạt", font=font_medium, fill=TEXT_MUTED)

price_mo = "99.000 ₫"
mo_sub = "/ tháng"
bbox_pm = draw.textbbox((0, 0), price_mo, font=font_extrabold)
draw.text((c2_x + c2_w - 45 - (bbox_pm[2] - bbox_pm[0]), c2_y + 55), price_mo, font=font_extrabold, fill=TEXT_WHITE)

bbox_msub = draw.textbbox((0, 0), mo_sub, font=font_medium)
draw.text((c2_x + c2_w - 45 - (bbox_msub[2] - bbox_msub[0]), c2_y + 130), mo_sub, font=font_medium, fill=TEXT_MUTED)


# Card 3: Weekly (59k)
c3_x, c3_y, c3_w, c3_h = 55, 1585, W - 110, 235
draw.rounded_rectangle([c3_x, c3_y, c3_x + c3_w, c3_y + c3_h], radius=40, fill=CARD_BG, outline=BORDER_COLOR, width=3)

rc3_x, rc3_y, rc3_r = c3_x + 60, c3_y + c3_h // 2, 26
draw.ellipse([rc3_x - rc3_r, rc3_y - rc3_r, rc3_x + rc3_r, rc3_y + rc3_r], outline=(71, 85, 105, 255), width=4)

draw.text((c3_x + 115, c3_y + 55), "1 Tuần", font=font_bold, fill=TEXT_WHITE)
draw.text((c3_x + 115, c3_y + 130), "Trải nghiệm ngắn hạn", font=font_medium, fill=TEXT_MUTED)

price_wk = "59.000 ₫"
wk_sub = "/ tuần"
bbox_pw = draw.textbbox((0, 0), price_wk, font=font_extrabold)
draw.text((c3_x + c3_w - 45 - (bbox_pw[2] - bbox_pw[0]), c3_y + 55), price_wk, font=font_extrabold, fill=TEXT_WHITE)

bbox_wsub = draw.textbbox((0, 0), wk_sub, font=font_medium)
draw.text((c3_x + c3_w - 45 - (bbox_wsub[2] - bbox_wsub[0]), c3_y + 130), wk_sub, font=font_medium, fill=TEXT_MUTED)


# 6. CTA Button
btn_x, btn_y, btn_w, btn_h = 55, 1875, W - 110, 135
btn_glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
bg_draw = ImageDraw.Draw(btn_glow)
bg_draw.rounded_rectangle([btn_x - 4, btn_y - 4, btn_x + btn_w + 4, btn_y + btn_h + 4], radius=46, fill=(56, 189, 248, 120))
btn_glow = btn_glow.filter(ImageFilter.GaussianBlur(18))
img = Image.alpha_composite(img, btn_glow)
draw = ImageDraw.Draw(img)

draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=42, fill=CYAN)

cta_text = "MỞ KHÓA PRO NGAY  →"
bbox_cta = draw.textbbox((0, 0), cta_text, font=font_cta)
draw.text(((W - (bbox_cta[2] - bbox_cta[0])) // 2, btn_y + 38), cta_text, font=font_cta, fill=(7, 11, 20, 255))


# 7. Footnote Disclaimer
disclaimer_1 = "Thanh toán khi xác nhận mua. Gói tự động gia hạn theo chu"
disclaimer_2 = "kỳ đã chọn; quản lý hoặc hủy trong cài đặt cửa hàng ứng dụng."
bbox_d1 = draw.textbbox((0, 0), disclaimer_1, font=font_regular)
bbox_d2 = draw.textbbox((0, 0), disclaimer_2, font=font_regular)
draw.text(((W - (bbox_d1[2] - bbox_d1[0])) // 2, 2060), disclaimer_1, font=font_regular, fill=TEXT_MUTED)
draw.text(((W - (bbox_d2[2] - bbox_d2[0])) // 2, 2108), disclaimer_2, font=font_regular, fill=TEXT_MUTED)


# 8. Legal Links
legal_text = "Điều khoản sử dụng (EULA)   •   Chính sách bảo mật"
bbox_leg = draw.textbbox((0, 0), legal_text, font=font_medium)
leg_x = (W - (bbox_leg[2] - bbox_leg[0])) // 2
leg_y = 2195
draw.text((leg_x, leg_y), legal_text, font=font_medium, fill=TEXT_MUTED)

# Draw underline for "Điều khoản sử dụng (EULA)" and "Chính sách bảo mật"
eula_w = draw.textlength("Điều khoản sử dụng (EULA)", font=font_medium)
draw.line([leg_x, leg_y + 40, leg_x + eula_w, leg_y + 40], fill=TEXT_MUTED, width=2)
privacy_w = draw.textlength("Chính sách bảo mật", font=font_medium)
draw.line([leg_x + (bbox_leg[2] - bbox_leg[0]) - privacy_w, leg_y + 40, leg_x + (bbox_leg[2] - bbox_leg[0]), leg_y + 40], fill=TEXT_MUTED, width=2)


# 9. Home Indicator Bar
hi_w, hi_h = 420, 14
hi_x = (W - hi_w) // 2
hi_y = 2500
draw.rounded_rectangle([hi_x, hi_y, hi_x + hi_w, hi_y + hi_h], radius=hi_h // 2, fill=(255, 255, 255, 140))

# Save 1179x2556 App Review Screenshot
out_1179 = "reports/paywall-ui/paywall-review-1179x2556.png"
img_rgb = img.convert("RGB")
img_rgb.save(out_1179, "PNG", dpi=(72, 72))
print("Saved App Review Screenshot:", out_1179, "Size:", img_rgb.size)

resample_filter = getattr(Image, 'Resampling', Image).LANCZOS
out_1290 = "reports/paywall-ui/paywall-review-1290x2796.png"
img_1290 = img_rgb.resize((1290, 2796), resample_filter)
img_1290.save(out_1290, "PNG", dpi=(72, 72))
print("Saved 1290x2796 App Review Screenshot:", out_1290, "Size:", img_1290.size)

# 10. Generate 1024x1024 Promotional Image (as required by Apple for IAP promotion)
# "JPG or PNG. Dimensions of 1024 x 1024 pixels. 72 dpi, RGB, flattened and no rounded corners."
promo = Image.new("RGB", (1024, 1024), (7, 11, 20))
p_draw = ImageDraw.Draw(promo)

# Subtle background gradient/glow
promo_glow = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
pg_draw = ImageDraw.Draw(promo_glow)
pg_draw.ellipse([212, 100, 812, 700], fill=(56, 189, 248, 45))
promo_glow = promo_glow.filter(ImageFilter.GaussianBlur(80))
promo.paste(promo_glow.convert("RGB"), (0, 0), promo_glow)
p_draw = ImageDraw.Draw(promo)

# Load hero icon or app icon
icon_paths = ['website/assets/icon.png', 'Biểu tượng neon xanh trên nền xanh đậm.png']
found_icon = next((p for p in icon_paths if os.path.exists(p)), None)
if found_icon:
    app_icon = Image.open(found_icon).convert("RGBA")
    app_icon = app_icon.resize((260, 260), resample_filter)
    mask = Image.new("L", (260, 260), 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle([0, 0, 260, 260], radius=58, fill=255)
    promo.paste(app_icon, ((1024 - 260) // 2, 140), mask)

# Promo Badge
pb_w, pb_h = 340, 68
pb_x = (1024 - pb_w) // 2
pb_y = 445
p_draw.rounded_rectangle([pb_x, pb_y, pb_x + pb_w, pb_y + pb_h], radius=pb_h // 2, fill=CYAN)
# Zap
pzx = pb_x + 40
pzy = pb_y + 18
p_draw.polygon([(pzx + 10, pzy), (pzx, pzy + 17), (pzx + 11, pzy + 17), (pzx + 7, pzy + 32), (pzx + 19, pzy + 13), (pzx + 9, pzy + 13)], fill=(7, 11, 20))
font_pb = get_font('Inter_900Black', 28)
p_draw.text((pb_x + 72, pb_y + 16), "TRAINXP PRO", font=font_pb, fill=(7, 11, 20))

# Promo Headline
font_p_title = get_font('Inter_900Black', 58)
pt1 = "Bứt phá thể hình & sức mạnh"
bbox_pt1 = p_draw.textbbox((0, 0), pt1, font=font_p_title)
p_draw.text(((1024 - (bbox_pt1[2] - bbox_pt1[0])) // 2, 545), pt1, font=font_p_title, fill=TEXT_WHITE)

font_p_sub = get_font('Inter_600SemiBold', 34)
pt2 = "Gói 1 Năm ưu đãi chỉ 499.000 ₫"
bbox_pt2 = p_draw.textbbox((0, 0), pt2, font=font_p_sub)
p_draw.text(((1024 - (bbox_pt2[2] - bbox_pt2[0])) // 2, 630), pt2, font=font_p_sub, fill=CYAN)

# Pricing comparison bar in promo
bar_x, bar_y, bar_w, bar_h = 100, 715, 824, 150
p_draw.rounded_rectangle([bar_x, bar_y, bar_x + bar_w, bar_y + bar_h], radius=28, fill=(14, 23, 38), outline=BORDER_COLOR, width=3)

# 3 columns inside bar
font_col_label = get_font('Inter_600SemiBold', 24)
font_col_price = get_font('Inter_900Black', 36)

cols = [
    ("GÓI NĂM (BEST)", "499.000 ₫", CYAN),
    ("GÓI THÁNG", "99.000 ₫", TEXT_WHITE),
    ("GÓI TUẦN", "59.000 ₫", TEXT_WHITE)
]

col_w = bar_w // 3
for i, (col_label, col_val, col_color) in enumerate(cols):
    cx = bar_x + i * col_w
    if i > 0:
        p_draw.line([cx, bar_y + 25, cx, bar_y + bar_h - 25], fill=BORDER_COLOR, width=2)
    
    b_cl = p_draw.textbbox((0, 0), col_label, font=font_col_label)
    p_draw.text((cx + (col_w - (b_cl[2] - b_cl[0])) // 2, bar_y + 35), col_label, font=font_col_label, fill=TEXT_MUTED)
    
    b_cv = p_draw.textbbox((0, 0), col_val, font=font_col_price)
    p_draw.text((cx + (col_w - (b_cv[2] - b_cv[0])) // 2, bar_y + 80), col_val, font=font_col_price, fill=col_color)

# Promo footer
font_p_foot = get_font('Inter_500Medium', 26)
p_foot = "Auto-renewable subscription • Cancel anytime in App Store"
bbox_pf = p_draw.textbbox((0, 0), p_foot, font=font_p_foot)
p_draw.text(((1024 - (bbox_pf[2] - bbox_pf[0])) // 2, 920), p_foot, font=font_p_foot, fill=TEXT_DIM)

out_1024 = "reports/paywall-ui/paywall-promotional-1024x1024.png"
promo.save(out_1024, "PNG", dpi=(72, 72))
print("Saved 1024x1024 Promotional Image:", out_1024, "Size:", promo.size)
