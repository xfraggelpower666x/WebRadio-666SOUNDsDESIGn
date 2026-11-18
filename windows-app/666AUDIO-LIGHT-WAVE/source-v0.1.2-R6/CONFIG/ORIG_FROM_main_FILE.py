# Historisches Fragment aus dem Hauptplayer. Referenz, kein Einstiegspunkt.
#         #______________________________________________________________________________________________________
#         #___FILEPATH_CONFIG___

#         config_neural_indices_json                = config.get("neural_indices_path", {}).get("neural_indices_json")
#         config_video_folder_all_vertical          = config.get("video_filepaths", {}).get("video_folder_all_vertical")
#         config_video_folder_all_horizontal        = config.get("video_filepaths", {}).get("video_folder_all_horizontal")
#         config_video_folder_all_horizontal_static = config.get("video_filepaths", {}).get("video_folder_all_horizontal_static")
#         config_video_folder_all_segments          = config.get("video_filepaths", {}).get("video_folder_all_segments")
#         config_video_folder_all_square_1          = config.get("video_filepaths", {}).get("video_folder_all_square_1")
#         config_video_folder_all_square_2          = config.get("video_filepaths", {}).get("video_folder_all_square_2")
#         config_video_folder_all_square_g_video    = config.get("video_filepaths", {}).get("video_folder_all_square_g_video")

#         #______________________________________________________________________________________________________
#         #___JSON_FILES___
#         neural_indices_filenames_all = [
#             os.path.join(config_neural_indices_json, f) for f in sorted(os.listdir(config_neural_indices_json))
#             if os.path.isfile(os.path.join(config_neural_indices_json, f)) and f.lower().endswith('.json')
#         ]
#         random.shuffle(neural_indices_filenames_all)

#         #______________________________________________________________________________________________________
#         #___VIDEO_FILES_LEFT___

#         video_filenames_all_left = []

#         for folder in [config_video_folder_all_horizontal, \
#                        config_video_folder_all_horizontal_static, \
#                        config_video_folder_all_segments, \
#                        config_video_folder_all_square_1, \
#                        config_video_folder_all_square_2, \
#                        config_video_folder_all_square_g_video]:
#             for f in os.listdir(folder):
#                 if f.lower().endswith('.mp4') and os.path.isfile(os.path.join(folder, f)):
#                     full_path = os.path.join(folder, f)
#                     try:
#                         num = int(os.path.splitext(f)[0])
#                         #num = int(os.path.splitext(f)[0].replace("-0000", ""))
#                         video_filenames_all_left.append((num, full_path))
#                     except ValueError:
#                         video_filenames_all_left.append((f.lower(), full_path))

#         video_filenames_all_left.sort(key=lambda x: x[0])
#         video_filenames_all_left = [path for num, path in video_filenames_all_left]
#         
#         #______________________________________________________________________________________________________
#         #___VIDEO_FILES_LEFT_WITHOUT_STATIC_IMG_VIDEOS__>>_FOR_REPLACEMENT_POOL___

#         if SHIFT_STATIC == 1:
#             video_filenames_left_replacement = []

#             for folder in [config_video_folder_all_horizontal, \
#                            config_video_folder_all_segments, \
#                            config_video_folder_all_square_1, \
#                            config_video_folder_all_square_2, \
#                            config_video_folder_all_square_g_video]:
#                 for f in os.listdir(folder):
#                     if f.lower().endswith('.mp4') and os.path.isfile(os.path.join(folder, f)):
#                         full_path = os.path.join(folder, f)
#                         try:
#                             num = int(os.path.splitext(f)[0])
#                             video_filenames_left_replacement.append((num, full_path))
#                         except ValueError:
#                             video_filenames_left_replacement.append((f.lower(), full_path))

#             video_filenames_left_replacement.sort(key=lambda x: x[0])
#             video_filenames_left_replacement = [path for num, path in video_filenames_left_replacement]

#             #___ONLY_STATIC_IMG_VIDEO_FILENAMES___
#             video_folder_static = config_video_folder_all_horizontal_static
#             video_filenames_static = [
#                 os.path.join(video_folder_static, f) for f in sorted(os.listdir(video_folder_static))
#                 if os.path.isfile(os.path.join(video_folder_static, f)) and f.lower().endswith('.mp4')
#             ]

#             video_base_filenames_static = []
#             for each in video_filenames_static:
#                 base_filename = each.replace("\\", "/")
#                 base_filename = base_filename.split("/")
#                 base_filename = base_filename[len(base_filename)-1]
#                 base_filename = base_filename.split(".mp4")
#                 base_filename = f"{base_filename[0]}.mp4"
#                 #print(f"base_filename = {base_filename}")
#                 video_base_filenames_static.append(base_filename)
#         #______________________________________________________________________________________________________
#         #___VIDEO_FILES_RIGHT___

#         video_filenames_all_right = []

#         for folder in [config_video_folder_all_horizontal, \
#                        config_video_folder_all_square_1, \
#                        config_video_folder_all_square_2, \
#                        config_video_folder_all_square_g_video, \
#                        config_video_folder_all_vertical]:
#             for f in os.listdir(folder):
#                 if f.lower().endswith('.mp4') and os.path.isfile(os.path.join(folder, f)):
#                     full_path = os.path.join(folder, f)
#                     try:
#                         num = int(os.path.splitext(f)[0])
#                         #num = int(os.path.splitext(f)[0].replace("-", ""))
#                         video_filenames_all_right.append((num, full_path))
#                     except ValueError:
#                         video_filenames_all_right.append((f.lower(), full_path))

#         video_filenames_all_right.sort(key=lambda x: x[0])
#         video_filenames_all_right = [path for num, path in video_filenames_all_right]
#         #______________________________________________________________________________________________________
#         #___VIDEO_FILES_VERTICAL___

#         video_filenames_all_vertical = []

#         for folder in [config_video_folder_all_vertical]:
#             for f in os.listdir(folder):
#                 if f.lower().endswith('.mp4') and os.path.isfile(os.path.join(folder, f)):
#                     full_path = os.path.join(folder, f)
#                     try:
#                         num = int(os.path.splitext(f)[0])
#                         #num = int(os.path.splitext(f)[0].replace("-", ""))
#                         video_filenames_all_vertical.append((num, full_path))
#                     except ValueError:
#                         video_filenames_all_vertical.append((f.lower(), full_path))

#         video_filenames_all_vertical.sort(key=lambda x: x[0])
#         video_filenames_all_vertical = [path for num, path in video_filenames_all_vertical]
