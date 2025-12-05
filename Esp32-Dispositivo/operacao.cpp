#include "operacao.h"
#include "font/lv_font.h"


extern void enviarSelecaoOperacao(const char* id);


lv_obj_t * scr_operacao = nullptr;
lv_obj_t * list_ops = nullptr;

static void event_handler_btn(lv_event_t * e) {
    lv_event_code_t code = lv_event_get_code(e);
    char * id = (char *)lv_event_get_user_data(e);
    
    if(code == LV_EVENT_CLICKED) {
        if (id) {
            enviarSelecaoOperacao(id);
        }
    }
    else if(code == LV_EVENT_DELETE) {
        if (id) {
            free(id);
        }
    }
}

void go_operacao() {
    if (!scr_operacao) {
        scr_operacao = new_screen(NULL, true);
        
        lv_obj_t * lbl_titulo = lv_label_create(scr_operacao);
        lv_obj_set_style_text_font(lbl_titulo, &lv_font_montserrat_26, 0);
        lv_label_set_text(lbl_titulo, "Selecione a Operacao");
        lv_obj_align(lbl_titulo, LV_ALIGN_TOP_MID, 0, 10);
        lv_obj_set_style_text_color(lbl_titulo, lv_color_white(), 0);

        list_ops = lv_list_create(scr_operacao);
        lv_obj_set_size(list_ops, 280, 170);
        lv_obj_align(list_ops, LV_ALIGN_BOTTOM_MID, 0, -10);
        lv_obj_set_style_bg_color(list_ops, lv_color_white(), 0);
    }
    lv_scr_load(scr_operacao);   
    lv_obj_add_flag(btn_exit, LV_OBJ_FLAG_HIDDEN);
}


void clear_operacao_list() {
    if (list_ops) {
        lv_obj_clean(list_ops);
    }
}

void add_operacao_to_list(const char* id, const char* nome, int meta) {
    if (!list_ops) return;
    
    String labelText = String(nome) + " (Meta: " + String(meta) + ")";
    lv_obj_t * btn = lv_list_add_btn(list_ops, NULL, labelText.c_str());
    
    char * id_copy = strdup(id);
    lv_obj_add_event_cb(btn, event_handler_btn, LV_EVENT_ALL, id_copy);
}
