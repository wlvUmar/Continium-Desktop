WINDOW_THEME_TOKENS: dict[str, dict[str, str]] = {
    "light": {
        "top_bg": "#F4F9FB",
        "top_border": "#D9E4EC",
        "title_text": "#36465D",
        "button_text": "#475A6C",
        "button_hover": "#E6EFF4",
        "close_hover": "#E85C5C",
    },
    "dark": {
        "top_bg": "#1A1631",
        "top_border": "#2A2A4A",
        "title_text": "#E0E0E0",
        "button_text": "#D0D6E0",
        "button_hover": "#292736",
        "close_hover": "#D94A4A",
    },
}

TRAY_THEME_TOKENS: dict[str, dict[str, str]] = {
    "light": {
        "menu_bg": "#F4F9FB",
        "menu_text": "#36465D",
        "menu_border": "#D9E4EC",
        "item_hover_bg": "#E8F5F7",
        "item_hover_text": "#07B6D5",
        "separator": "#D9E4EC",
        "row_bg": "#FFFFFF",
        "project_name": "#475A6C",
        "project_meta": "#7A8A9A",
        "icon_label": "#475A6C",
    },
    "dark": {
        "menu_bg": "#1A1631",
        "menu_text": "#E0E0E0",
        "menu_border": "#2A2A4A",
        "item_hover_bg": "#292736",
        "item_hover_text": "#7FD7E8",
        "separator": "#2A2A4A",
        "row_bg": "#15122A",
        "project_name": "#D8E1EA",
        "project_meta": "#98A8B8",
        "icon_label": "#D8E1EA",
    },
}

OVERLAY_THEMES = {
    "dark": {
        "border": "#2A2A4A",
        "accent": "#07B6D5",
        "accent_dim": "#1693C5",
        "text_primary": "#E0E0E0",
        "text_secondary": "#AEBBD0",
        "btn_bg": "#1A1A2E",
        "btn_hover": "#2A2A4A",
        "danger": "#D94A4A",
        "progress_track": "#2A2A4A",
    },
    "light": {
        "border": "#D7D6D6",
        "accent": "#07B6D5",
        "accent_dim": "#1693C5",
        "text_primary": "#475A6C",
        "text_secondary": "#5A7892",
        "btn_bg": "#DDEFF4",
        "btn_hover": "#CCE5EC",
        "danger": "#E85C5C",
        "progress_track": "#D9D9D9",
    },
}

def window_stylesheet(theme_mode) -> str:
    """Return stylesheet for custom title bar."""
    tokens = WINDOW_THEME_TOKENS[theme_mode]
    stylesheet = """
        #topBar {
            background: __TOP_BG__;
            border-bottom: 1px solid __TOP_BORDER__;
        }
        #titleLabel {
            font-weight: 700;
            font-size: 16px;
            color: __TITLE_TEXT__;
        }
        #titleButton, #closeButton {
            background: transparent;
            color: __BUTTON_TEXT__;
            border: none;
            padding: 6px 10px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 18px;
        }
        #titleButton:hover {
            background: __BUTTON_HOVER__;
        }
        #closeButton:hover {
            background: __CLOSE_HOVER__;
            color: white;
        }
    """
    return (
        stylesheet
        .replace("__TOP_BG__", tokens["top_bg"])
        .replace("__TOP_BORDER__", tokens["top_border"])
        .replace("__TITLE_TEXT__", tokens["title_text"])
        .replace("__BUTTON_TEXT__", tokens["button_text"])
        .replace("__BUTTON_HOVER__", tokens["button_hover"])
        .replace("__CLOSE_HOVER__", tokens["close_hover"])
    )


def tray_stylesheet(theme_mode):
    tokens = TRAY_THEME_TOKENS[theme_mode]
    stylesheet = """
        QMenu {
            background: __MENU_BG__;
            color: __MENU_TEXT__;
            border: 1px solid __MENU_BORDER__;
            border-radius: 8px;
            padding: 8px;
        }
        QMenu::item:selected {
            background: __ITEM_HOVER_BG__;
            color: __ITEM_HOVER_TEXT__;
        }
        QMenu::separator {
            background: __SEPARATOR__;
            margin: 4px 0px;
        }
        #trayProjectRow {
            background: __ROW_BG__;
            border-radius: 10px;
        }
        #trayProjectName {
            color: __PROJECT_NAME__;
            font-weight: 700;
            font-size: 13px;
        }
        #trayProjectMeta {
            color: __PROJECT_META__;
            font-size: 11px;
        }
        #trayStartButton {
            background: transparent;
            border: none;
            padding: 0px;
        }
        #trayIconRow {
            background: __ROW_BG__;
            border-radius: 10px;
        }
        #trayIconButton {
            background: transparent;
            border: none;
            padding: 0px;
        }
        #trayIconLabel {
            color: __ICON_LABEL__;
            font-weight: 700;
            font-size: 13px;
        }
        QPushButton {
            background: transparent;
            border: none;
            padding: 0px;
        }
    """
    return (stylesheet
        .replace("__MENU_BG__", tokens["menu_bg"])
        .replace("__MENU_TEXT__", tokens["menu_text"])
        .replace("__MENU_BORDER__", tokens["menu_border"])
        .replace("__ITEM_HOVER_BG__", tokens["item_hover_bg"])
        .replace("__ITEM_HOVER_TEXT__", tokens["item_hover_text"])
        .replace("__SEPARATOR__", tokens["separator"])
        .replace("__ROW_BG__", tokens["row_bg"])
        .replace("__PROJECT_NAME__", tokens["project_name"])
        .replace("__PROJECT_META__", tokens["project_meta"])
        .replace("__ICON_LABEL__", tokens["icon_label"])
    )

# utils/theme.py

def build_overlay_styles(t: dict) -> str:
    return f"""
        #overlayCard  {{ background:transparent; border:1px solid {t['border']}; border-radius:16px; }}
        #dragBar      {{ background:transparent; border:none; }}
        #gripIcon     {{ color:{t['text_secondary']}; font-size:14px; letter-spacing:1px; }}
        #overlayClose {{ background:transparent; color:{t['text_secondary']}; border:none;
                         font-size:11px; border-radius:4px; }}
        #overlayClose:hover {{ background:{t['danger']}; color:white; }}
        #timeLabel    {{ font-size:30px; font-weight:700; color:{t['text_primary']};
                         font-variant-numeric:tabular-nums; letter-spacing:-1px; }}
        #statusLabel  {{ font-size:11px; color:{t['text_secondary']}; }}
        #primaryBtn   {{ background:{t['accent']}; color:white; border:none; border-radius:8px;
                         padding:7px 14px; font-size:13px; font-weight:600; }}
        #primaryBtn:hover  {{ background:{t['accent_dim']}; }}
        #secondaryBtn {{ background:{t['btn_bg']}; color:{t['text_secondary']}; border:none;
                         border-radius:8px; padding:7px 6px; font-size:13px; font-weight:700; }}
        #secondaryBtn:hover {{ background:{t['btn_hover']}; color:{t['danger']}; }}
    """