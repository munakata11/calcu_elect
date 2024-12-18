(defun c:measure_two_points ()
  (setvar "CMDECHO" 0)  ; コマンドエコーを無効化
  (setq old-error *error* *error* measure_error)  ; エラーハンドラを設定
  
  (setq pt1 (getpoint "\n1点目を選択してください: "))
  (if pt1
    (progn
      (setq pt2 (getpoint pt1 "\n2点目を選択してください: "))
      (if pt2
        (progn
          (command "_measuregeom" pt1 pt2)
          (setq distance (getvar "measuregeom"))
          (setq result (strcat "(distance . " (rtos distance 2 3) ")"))
          (princ result)
          (princ)
        )
        (progn
          (princ "\nキャンセルされました")
          (setq *error* old-error)
          (setvar "CMDECHO" 1)
        )
      )
    )
    (progn
      (princ "\nキャンセルされました")
      (setq *error* old-error)
      (setvar "CMDECHO" 1)
    )
  )
  (setq *error* old-error)
  (setvar "CMDECHO" 1)
  (princ)
)

(defun measure_error (msg)
  (princ "\nエラーが発生しました: ")
  (princ msg)
  (setq *error* old-error)
  (setvar "CMDECHO" 1)
  (princ)
) 