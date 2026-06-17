import { useEffect, useRef, useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

const JSON_PATH = "/A2_B1_wordlist_enriched_v3.json";
const PROGRESS_KEY = "wordlist-progress";
const SETTINGS_KEY = "wordlist-settings";

const DEFAULT_SETTINGS = {
  apiKey: "",
  voiceId: "JBFqnCBsd6RMkjVDRZzb",
  modelId: "eleven_v3",
  speed: 0.7,
};

function clampSpeed(speed) {
  const n = Number(speed);
  if (Number.isNaN(n)) return 0.7;
  return Math.min(1.2, Math.max(0.7, n));
}

function loadSettings() {
  try {
    const merged = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
    merged.speed = clampSpeed(merged.speed);
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function loadProgress() {
  try {
    const n = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "0");
    return typeof n === "number" ? n : 0;
  } catch {
    return 0;
  }
}

function prepareSpeechText(text, settings) {
  const speed = clampSpeed(settings.speed);
  if (!settings.modelId.includes("v3") || speed >= 1) return text;
  if (speed <= 0.75) return `[drawn out] ${text}`;
  if (speed <= 0.85) return `[slows down] ${text}`;
  return `[deliberate] ${text}`;
}

async function speak(text, settings) {
  if (!settings.apiKey) throw new Error("Add your ElevenLabs API key in Settings");

  const speed = clampSpeed(settings.speed);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${settings.voiceId}`, {
    method: "POST",
    headers: {
      Accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": settings.apiKey,
    },
    body: JSON.stringify({
      text: prepareSpeechText(text, settings),
      model_id: settings.modelId,
      language_code: "de",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true,
        speed,
      },
    }),
  });

  if (!res.ok) throw new Error(`ElevenLabs error ${res.status}`);
  return URL.createObjectURL(await res.blob());
}

export default function App() {
  const [words, setWords] = useState([]);
  const [index, setIndex] = useState(loadProgress);
  const [jumpValue, setJumpValue] = useState("");
  const [settings, setSettings] = useState(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftSettings, setDraftSettings] = useState(settings);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    fetch(JSON_PATH)
      .then((r) => r.json())
      .then((data) => {
        setWords(data);
        setIndex((i) => Math.min(i, Math.max(0, data.length - 1)));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (words.length) localStorage.setItem(PROGRESS_KEY, String(index));
  }, [index, words.length]);

  useEffect(() => () => {
    if (audioRef.current) URL.revokeObjectURL(audioRef.current);
  }, []);

  const entry = words[index];
  const total = words.length;

  function goTo(i) {
    if (!total) return;
    setIndex(Math.max(0, Math.min(total - 1, i)));
  }

  function saveSettings() {
    const next = { ...draftSettings, speed: clampSpeed(draftSettings.speed) };
    setDraftSettings(next);
    setSettings(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    setSettingsOpen(false);
  }

  async function handleSpeak() {
    if (!entry || speaking) return;
    if (audioRef.current) {
      URL.revokeObjectURL(audioRef.current);
      audioRef.current = null;
    }
    setSpeaking(true);
    try {
      const url = await speak(entry.word, settings);
      audioRef.current = url;
      const audio = new Audio(url);
      audio.playbackRate = clampSpeed(settings.speed);
      audio.onended = () => setSpeaking(false);
      await audio.play();
    } catch (err) {
      alert(err.message);
      setSpeaking(false);
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!total) {
    return (
      <Box p={4} textAlign="center">
        <Typography>Could not load {JSON_PATH}</Typography>
      </Box>
    );
  }

  return (
    <>
      <AppBar position="sticky" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            German Wordlist
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
            {index + 1} / {total}
          </Typography>
          <IconButton onClick={() => { setDraftSettings(settings); setSettingsOpen(true); }}>
            <SettingsIcon />
          </IconButton>
        </Toolbar>
        <LinearProgress variant="determinate" value={((index + 1) / total) * 100} />
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 4 }}>
        {entry && (
          <Card elevation={3}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={`#${entry.index ?? index}`} size="small" />
                  <Chip label={entry.role} size="small" color="primary" variant="outlined" />
                </Stack>

                <Typography variant="h4" component="h1">
                  {entry.word}
                </Typography>

                <Typography variant="h6" color="text.secondary">
                  {entry.english}
                </Typography>

                {entry.pronunciation && (
                  <Typography variant="body2" fontFamily="monospace" color="text.secondary">
                    {entry.pronunciation}
                  </Typography>
                )}

                {entry.past_tense && (
                  <Typography variant="body2">
                    <strong>Past:</strong> {entry.past_tense}
                  </Typography>
                )}

                {entry.examples?.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Examples
                    </Typography>
                    {entry.examples.length === 1 ? (
                      <Typography variant="body1" sx={{ fontSize: "1.05rem", lineHeight: 1.6 }}>
                        {entry.examples[0]}
                      </Typography>
                    ) : (
                      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                        {entry.examples.map((ex, i) => (
                          <Box component="li" key={i} sx={{ mb: 0.75 }}>
                            <Typography variant="body1" sx={{ fontSize: "1.05rem", lineHeight: 1.6 }}>
                              {ex}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}

                <Button
                  variant="outlined"
                  startIcon={<VolumeUpIcon />}
                  onClick={handleSpeak}
                  disabled={speaking}
                >
                  {speaking ? "Playing…" : "Play pronunciation"}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        )}

        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ mt: 3 }}>
          <Button
            variant="contained"
            startIcon={<NavigateBeforeIcon />}
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
          >
            Previous
          </Button>
          <Button
            variant="contained"
            endIcon={<NavigateNextIcon />}
            onClick={() => goTo(index + 1)}
            disabled={index === total - 1}
          >
            Next
          </Button>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
          <TextField
            size="small"
            label="Jump to #"
            type="number"
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const n = parseInt(jumpValue, 10);
                if (!isNaN(n)) goTo(n);
              }
            }}
            sx={{ width: 120 }}
            inputProps={{ min: 0, max: total - 1 }}
          />
          <Button
            variant="outlined"
            onClick={() => {
              const n = parseInt(jumpValue, 10);
              if (!isNaN(n)) goTo(n);
            }}
          >
            Go
          </Button>
        </Stack>
      </Container>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="ElevenLabs API Key"
              type="password"
              fullWidth
              value={draftSettings.apiKey}
              onChange={(e) => setDraftSettings({ ...draftSettings, apiKey: e.target.value })}
            />
            <TextField
              label="Voice ID"
              fullWidth
              value={draftSettings.voiceId}
              onChange={(e) => setDraftSettings({ ...draftSettings, voiceId: e.target.value })}
            />
            <TextField
              label="Model ID"
              fullWidth
              value={draftSettings.modelId}
              onChange={(e) => setDraftSettings({ ...draftSettings, modelId: e.target.value })}
            />
            <TextField
              label="Speech speed"
              type="number"
              fullWidth
              value={draftSettings.speed}
              onChange={(e) => setDraftSettings({ ...draftSettings, speed: e.target.value })}
              onBlur={() =>
                setDraftSettings((s) => ({ ...s, speed: clampSpeed(s.speed) }))
              }
              inputProps={{ min: 0.7, max: 1.2, step: 0.05 }}
              helperText="0.7 = slow, 1.0 = normal, 1.2 = fast. Save, then play again."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveSettings}>Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
