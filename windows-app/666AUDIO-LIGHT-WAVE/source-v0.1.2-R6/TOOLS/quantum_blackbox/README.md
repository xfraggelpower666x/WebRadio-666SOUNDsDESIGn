QuantumBlackBox has been migrated out of the main file into its own tool
located at /TOOLS/quantum_blackbox. This functionality can be run "real-time"
before actual graphics run but due to limitations in windows GPU cannot be used
to calculate the vectors/wave probs; also WSL seemed to have trouble with qiskit,
and also in linux it wasn't quite easy and still trying to compile from source the
CUDA support that seems to be a mixed bag of success for people... thus, precalc.
